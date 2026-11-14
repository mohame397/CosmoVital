import research from './data/space-physiology.js';
import environment from './data/space-environment-standards.js';

export { research, environment };

const copy = value => JSON.parse(JSON.stringify(value));
const quantities = Object.fromEntries(environment.quantities.map(item => [item.id, item]));
const pressureUnitFactor = 7.5006168270417;
const cabinInputNames = new Set(['pressureKPa', 'oxygenPercent', 'co2MmHg', 'co2WindowMinutes']);

export function getResearchSummary(metric, timepoint = 'FD15', posture = 'inflight') {
  for (const study of research.studies) {
    const indicator = study.metrics.find(item => item.metric === metric);
    const cell = indicator?.summaries.find(item => item.timepoint === timepoint && item.posture === posture);
    if (!cell) continue;
    return copy({
      ...cell,
      metric,
      unit: indicator.unit,
      name: indicator.name,
      studyId: study.id,
      studyTitle: study.title,
      sourceUrl: study.sourceUrl,
      sourceLocation: study.sourceLocation,
      doi: study.doi,
      statistic: study.statistic,
      cohortSize: study.population.cohortSize,
      perPointSampleSize: study.perPointSampleSize,
      sampleSizeNote: study.sampleSizeNote,
      population: study.population,
      timepointMetadata: study.timepoints.find(item => item.id === timepoint),
      clinicalThreshold: false,
      interpretation: study.interpretation
    });
  }
  return null;
}

export function compareResearch(value, options = {}) {
  const unavailable = reason => ({ available: false, reason, clinicalAssessment: false });
  if (!options || typeof options !== 'object' || Array.isArray(options)) return unavailable('invalid-context');
  if (options.contextConfirmed !== true) return unavailable('context-not-confirmed');
  if (typeof value !== 'number' || !Number.isFinite(value)) return unavailable('invalid-value');
  const summary = getResearchSummary(options.metric, options.timepoint, options.posture);
  if (!summary) return unavailable('unsupported-research-cell');
  return {
    available: true,
    value,
    delta: value - summary.mean,
    unit: summary.unit,
    summary,
    comparisonType: 'difference-from-published-group-mean',
    clinicalAssessment: false
  };
}

function finiteInput(name, value, { min = 0, exclusiveMin = false, max = Infinity } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number; omit unavailable measurements.`);
  }
  if ((exclusiveMin ? value <= min : value < min) || value > max) {
    throw new RangeError(`${name} must be ${exclusiveMin ? 'greater than' : 'at least'} ${min}${Number.isFinite(max) ? ` and at most ${max}` : ''}.`);
  }
  return value;
}

function nominalComparison(value, target) {
  const tolerance = Number.EPSILON * 16 * Math.max(Math.abs(value), target.maximum);
  if (value < target.minimum - tolerance) return 'below-nominal-target';
  if (value > target.maximum + tolerance) return 'above-nominal-target';
  return 'within-nominal-target';
}

export function evaluateCabin(values = {}) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    throw new TypeError('Cabin measurements must be an object.');
  }
  for (const key of Object.keys(values)) {
    if (!cabinInputNames.has(key)) throw new TypeError(`Unsupported cabin input: ${key}.`);
  }
  const inputs = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    inputs[key] = finiteInput(key, value, {
      exclusiveMin: key === 'pressureKPa' || key === 'co2WindowMinutes',
      max: key === 'oxygenPercent' ? 100 : Infinity
    });
  }
  if (inputs.co2WindowMinutes !== undefined && inputs.co2MmHg === undefined) {
    throw new TypeError('co2WindowMinutes requires an actual co2MmHg measurement.');
  }
  const result = {
    status: Object.keys(inputs).length ? 'reference-comparison' : 'empty',
    inputs,
    calculations: {},
    sourceIds: [],
    clinicalAssessment: false,
    context: 'pressurized-cabin'
  };
  if (inputs.pressureKPa !== undefined) {
    const source = quantities['cabin-pressure'];
    const range = source.range;
    const comparison = inputs.pressureKPa <= range.minimum ? 'below-reference-range'
      : inputs.pressureKPa > range.maximum ? 'above-reference-range' : 'within-reference-range';
    result.pressure = {
      value: inputs.pressureKPa,
      unit: source.unit,
      comparison,
      sourceId: source.source.requirement,
      sourceUrl: source.source.url,
      reference: copy(range)
    };
    result.calculations.pressureMmHg = inputs.pressureKPa * pressureUnitFactor;
    if (!Number.isFinite(result.calculations.pressureMmHg)) {
      throw new RangeError('Pressure conversion exceeds supported numeric precision.');
    }
    result.sourceIds.push(source.source.requirement);
  }
  if (inputs.pressureKPa !== undefined && inputs.oxygenPercent !== undefined) {
    const source = quantities['inspired-oxygen'];
    const pressureMmHg = result.calculations.pressureMmHg;
    if (pressureMmHg <= source.formula.waterVaporCorrection_mmHg) {
      throw new RangeError('Pressure is too low for the published inspired-oxygen calculation.');
    }
    const value = (pressureMmHg - source.formula.waterVaporCorrection_mmHg) * inputs.oxygenPercent / 100;
    if (!Number.isFinite(value)) throw new RangeError('Inspired-oxygen calculation exceeds supported numeric precision.');
    result.calculations.inspiredOxygenMmHg = value;
    result.inspiredOxygen = {
      value,
      unit: source.unit,
      comparison: nominalComparison(value, source.nominalTarget),
      sourceId: source.source.requirement,
      sourceUrl: source.source.url,
      reference: copy(source.nominalTarget),
      averagingAssessment: 'not-evaluated-from-spot-reading',
      personalSpO2Assessment: false
    };
    result.sourceIds.push(source.source.requirement);
  }
  if (inputs.co2MmHg !== undefined) {
    const source = quantities['cabin-carbon-dioxide'];
    const comparison = inputs.co2WindowMinutes !== source.nominalLimit.averagingWindowMinutes ? 'insufficient-averaging'
      : inputs.co2MmHg > source.nominalLimit.maximum ? 'above-nominal-limit' : 'at-or-below-nominal-limit';
    result.co2 = {
      value: inputs.co2MmHg,
      unit: source.unit,
      comparison,
      windowMinutes: inputs.co2WindowMinutes ?? null,
      sourceId: source.source.requirement,
      sourceUrl: source.source.url,
      reference: copy(source.nominalLimit)
    };
    result.sourceIds.push(source.source.requirement);
  }
  return result;
}
