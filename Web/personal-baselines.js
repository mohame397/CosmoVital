import {METRICS,assessRecord} from './core.js';

export const BASELINE_VERSION='1.0.0';
export const BASELINE_RULES=Object.freeze({
 minimumObservations:5,minimumUtcDays:3,defaultEarlyMissionDays:7,
 minimumRollingDays:7,maximumRollingDays:14,defaultRollingDays:14,
 madScale:1.4826,madMultiplier:3,resolutionMultiplier:2,
 intervalPercentiles:[10,90],clinicalThreshold:false,
 explanation:'Prototype descriptive heuristics, not clinical limits or estimates of medical safety.'
});
const DAY=86400000;
const TYPES=['preflight','early-mission','rolling'];
const KNOWN_CONTEXTS=['resting','during-exercise','exercise','post-exercise','post-eva','sleep'];
const ORDINAL=new Set(['mood','energy']);
const DEVICE_METRICS=new Set(['heart','oxygen','sys','dia','temp','glucose','hrv','eda']);
const META_FIELDS=['device','method','posture','temperatureSite','glucoseTiming','hrvMethod'];
const UNKNOWN=new Set(['','unknown','unspecified','other','not recorded','not available','n/a']);
const clean=value=>typeof value==='string'?value.trim():'';
const normalized=value=>clean(value).toLocaleLowerCase('en-US');
const known=value=>!UNKNOWN.has(normalized(value));
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const flag=value=>value===true||typeof value==='string'&&['true','yes','1'].includes(value.toLowerCase().trim());
const hasSimulation=record=>[record.simulated,record.training,record.synthetic].some(flag)||[record.source,record.source_tag,record.mode,record.source_type].some(value=>typeof value==='string'&&/(?:^|[^a-z])(?:simulat(?:ed|ion)|demo|training|synthetic)(?:$|[^a-z])/i.test(value));
const hasResearch=record=>[record.research,record.spaceWeather,record.space_weather].some(flag)||[record.source,record.source_tag,record.source_type,record.mode,record.data_category,record.classification].some(value=>typeof value==='string'&&/research|space[- _]?weather|published[- _]?summary|osdr/i.test(value));

function instant(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value))return NaN;
 const [year,month,day]=value.slice(0,10).split('-').map(Number);
 const [hour,minute,second]=value.slice(11,19).split(':').map(Number);
 if(month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate()||hour>23||minute>59||second>59)return NaN;
 return Date.parse(value);
}
function validValues(record){
 if(!record.values||typeof record.values!=='object'||Array.isArray(record.values))return false;
 const present=Object.entries(record.values).filter(([,value])=>value!==null&&value!==undefined);
 if(!present.length)return false;
 if(present.some(([key,value])=>!METRICS[key]||!finite(value)||value<METRICS[key].min||value>METRICS[key].max||METRICS[key].step===1&&!Number.isInteger(value)))return false;
 const {sys,dia}=record.values;
 return !((sys==null)!==(dia==null))&&!(sys!=null&&sys<=dia);
}
function percentile(sorted,fraction){
 const index=(sorted.length-1)*fraction,lower=Math.floor(index),upper=Math.ceil(index);
 return sorted[lower]+(sorted[upper]-sorted[lower])*(index-lower);
}
function ordinalQuantile(sorted,fraction){return sorted[Math.max(0,Math.ceil(sorted.length*fraction)-1)]}
function smallHash(value){let result=2166136261;for(const char of value){result^=char.codePointAt(0);result=Math.imul(result,16777619)}return (result>>>0).toString(16)}
function requiredFields(metric){
 const fields=DEVICE_METRICS.has(metric)?['device','method']:[];
 if(metric==='temp')fields.push('temperatureSite');
 if(metric==='glucose')fields.push('glucoseTiming');
 if(metric==='hrv')fields.push('hrvMethod');
 return fields;
}
const acquisitionFields=metric=>['device','method','posture',...(metric==='temp'?['temperatureSite']:metric==='glucose'?['glucoseTiming']:metric==='hrv'?['hrvMethod']:[])];

export function summarizeBaseline(records,options={}){
 const metric=options.metric,context=options.context||'resting',type=options.type||'preflight';
 const asOf=instant(options.asOf??new Date().toISOString()),mission=instant(options.missionStart);
 const earlyDays=options.earlyMissionDays??BASELINE_RULES.defaultEarlyMissionDays;
 const rollingDays=options.rollingDays??BASELINE_RULES.defaultRollingDays;
 const excludedReasons={};
 const exclude=reason=>{excludedReasons[reason]=(excludedReasons[reason]||0)+1};
 const result={status:'insufficient',reason:'insufficient-observations',metric,unit:METRICS[metric]?.unit||null,type,context,
  count:0,days:0,median:null,mad:null,scaledMad:null,range:null,min:null,max:null,recordIds:[],
  excludedReasons,windowStart:null,windowEnd:null,version:BASELINE_VERSION,clinicalAssessment:false,
  minimumObservations:BASELINE_RULES.minimumObservations,minimumUtcDays:BASELINE_RULES.minimumUtcDays,
  statisticalMethod:ORDINAL.has(metric)?'ordinal-category-median-and-frequencies':'median-MAD-and-empirical-p10-p90',
  comparisonThreshold:null,contextFingerprint:null,provisional:true,safetyReviewCount:0,safetyReviewExcluded:0,
  simulated:options.demo===true,preflightFrozen:false,notes:[]};
 const unavailable=reason=>({...result,reason});
 if(!Array.isArray(records)||!METRICS[metric]||!TYPES.includes(type)||!Number.isFinite(asOf))return unavailable('invalid-configuration');
 if(!Number.isFinite(mission))return unavailable('mission-start-required');
 if(!Number.isInteger(earlyDays)||earlyDays<1||earlyDays>30||!Number.isInteger(rollingDays)||rollingDays<7||rollingDays>14)return unavailable('invalid-window-configuration');
 if(!KNOWN_CONTEXTS.includes(context))return unavailable('measurement-context-required');
 let start=-Infinity,end;
 if(type==='preflight'){end=Math.min(mission,asOf);result.preflightFrozen=asOf>=mission}
 else if(type==='early-mission'){
  start=mission;end=mission+earlyDays*DAY;
  result.windowStart=new Date(start).toISOString();result.windowEnd=new Date(end).toISOString();
  if(asOf<end)return unavailable('early-mission-window-incomplete');
 }else{start=Math.max(mission,asOf-rollingDays*DAY);end=asOf}
 result.windowStart=Number.isFinite(start)?new Date(start).toISOString():null;
 result.windowEnd=new Date(end).toISOString();
 if(start>=end)return unavailable('baseline-period-not-started');
 const valid=[],ids=new Map(),conflicts=new Set();
 for(const record of records){
  if(!record||typeof record!=='object'||Array.isArray(record)||typeof record.id!=='string'||!record.id){exclude('invalid-record');continue}
  const fingerprint=JSON.stringify([record.measured_at??record.timestamp,record.values,record.context,record.meta,record.source,record.source_tag,record.simulated]);
  if(ids.has(record.id)&&ids.get(record.id)!==fingerprint)conflicts.add(record.id);else ids.set(record.id,fingerprint);
 }
 const seenIds=new Set(),seenObservations=new Set();
 for(const record of records){
  if(!record||typeof record!=='object'||Array.isArray(record)||typeof record.id!=='string'||!record.id)continue;
  if(conflicts.has(record.id)){exclude('conflicting-identifier');continue}
  if(seenIds.has(record.id)){exclude('duplicate-identifier');continue}seenIds.add(record.id);
  if(hasResearch(record)){exclude('nonpersonal-research-data');continue}
  if(options.demo===true?record.simulated!==true:hasSimulation(record)){exclude('different-data-mode');continue}
  if(!validValues(record)){exclude('invalid-measurements');continue}
  if(!finite(record.values[metric])){exclude('metric-not-recorded');continue}
  const time=instant(record.measured_at??record.timestamp);
  if(!Number.isFinite(time)||record.measured_at&&record.timestamp&&instant(record.timestamp)!==time){exclude('invalid-timestamp');continue}
  if(record.id===options.currentRecordId||time>=asOf){exclude('current-or-future-measurement');continue}
  if(time<start||time>=end){exclude('outside-baseline-period');continue}
  if(record.context!==context){exclude('different-activity-context');continue}
  if(normalized(record.meta?.signal)==='unstable'){exclude('unstable-signal');continue}
  const metadata=Object.fromEntries(META_FIELDS.map(key=>[key,clean(record.meta?.[key])]));
  if(acquisitionFields(metric).some(key=>known(options[key])&&normalized(metadata[key])!==normalized(options[key]))){exclude('different-acquisition-context');continue}
  const missing=requiredFields(metric).filter(key=>!known(metadata[key]));
  if(missing.length){exclude('missing-acquisition-context');continue}
  const signature=JSON.stringify([time,record.values[metric],record.context,...META_FIELDS.map(key=>normalized(metadata[key])),record.source,record.source_tag]);
  if(seenObservations.has(signature)){exclude('duplicate-observation');continue}seenObservations.add(signature);
  const safetyMetric=['sys','dia'].includes(metric)?'bp':metric;
  const prompts=assessRecord(record).filter(prompt=>prompt.metric===safetyMetric);
  if(prompts.some(prompt=>prompt.severity==='urgent')){exclude('urgent-safety-prompt');continue}
  valid.push({record,time,value:record.values[metric],metadata,review:prompts.some(prompt=>prompt.severity==='review')});
 }
 valid.sort((a,b)=>a.time-b.time||a.record.id.localeCompare(b.record.id));
 result.count=valid.length;result.days=new Set(valid.map(item=>new Date(item.time).toISOString().slice(0,10))).size;
 result.recordIds=valid.map(item=>item.record.id);
 result.safetyReviewCount=valid.filter(item=>item.review).length;
 result.safetyReviewExcluded=excludedReasons['urgent-safety-prompt']||0;
 const comparisonFields=acquisitionFields(metric);
 const mixed=comparisonFields.filter(key=>new Set(valid.map(item=>normalized(item.metadata[key])).filter(value=>!UNKNOWN.has(value))).size>1);
 const mixedKnownMissing=comparisonFields.filter(key=>valid.some(item=>known(item.metadata[key]))&&valid.some(item=>!known(item.metadata[key])));
 if(mixed.length||mixedKnownMissing.length){result.notes.push('Acquisition methods, devices or metric-specific contexts are mixed; choose a compatible stratum.');result.mixedFields=[...new Set([...mixed,...mixedKnownMissing])];return unavailable('mixed-acquisition-context')}
 if(result.count<BASELINE_RULES.minimumObservations||result.days<BASELINE_RULES.minimumUtcDays)return result;
 const values=valid.map(item=>item.value).sort((a,b)=>a-b),ordinal=ORDINAL.has(metric);
 result.median=ordinal?ordinalQuantile(values,.5):percentile(values,.5);
 result.mad=ordinal?null:percentile(values.map(value=>Math.abs(value-result.median)).sort((a,b)=>a-b),.5);
 result.scaledMad=ordinal?null:BASELINE_RULES.madScale*result.mad;
 result.range={low:ordinal?ordinalQuantile(values,.1):percentile(values,.1),high:ordinal?ordinalQuantile(values,.9):percentile(values,.9),
  kind:ordinal?'observed-category-interval':'empirical-p10-p90',clinicalThreshold:false,
  method:ordinal?'nearest-rank-category-quantiles':'linear-interpolated-sample-percentiles',sampleCount:values.length};
 result.min=values[0];result.max=values.at(-1);
 result.contextFingerprint={context,...Object.fromEntries(comparisonFields.map(key=>[key,valid[0].metadata[key]||'unknown']))};
 result.comparisonThreshold=ordinal?null:Math.max(BASELINE_RULES.madMultiplier*result.scaledMad,BASELINE_RULES.resolutionMultiplier*METRICS[metric].step);
 result.provisional=type==='rolling'||result.safetyReviewCount>0||result.safetyReviewExcluded>0;
 if(ordinal){
  result.distribution=Object.fromEntries([1,2,3,4,5].map(category=>[category,{count:values.filter(value=>value===category).length,proportion:values.filter(value=>value===category).length/values.length}]));
  result.ordinalMedianInterval=[values[Math.floor((values.length-1)/2)],values[Math.ceil((values.length-1)/2)]];
 }
 result.notes.push('This interval describes recorded history; being inside it does not establish health or safety.');
 if(type==='rolling')result.notes.push('A rolling baseline can adapt to persistent changes; compare with a fixed preflight baseline and independent safety checks.');
 if(result.safetyReviewCount)result.notes.push('Some included observations generated general review prompts; those prompts remain active independently.');
 if(result.safetyReviewExcluded)result.notes.push('Observations with urgent general safety prompts were excluded; their exclusion is not evidence of recovery.');
 result.status='established';result.reason=null;
 result.id=`baseline-${smallHash(JSON.stringify([result.version,type,metric,context,result.windowStart,result.windowEnd,valid.map(item=>[item.record.id,item.time,item.value]),result.contextFingerprint]))}`;
 return result;
}

export function comparePersonal(value,baseline){
 const unavailable=reason=>({available:false,reason,absoluteDeviation:null,signedDeviation:null,percentDeviation:null,unusual:false,clinicalAssessment:false});
 if(!baseline||baseline.status!=='established'||!METRICS[baseline.metric]||!finite(baseline.median))return unavailable('insufficient-personal-data');
 if(!finite(value)||value<METRICS[baseline.metric].min||value>METRICS[baseline.metric].max||METRICS[baseline.metric].step===1&&!Number.isInteger(value))return unavailable('invalid-measurement');
 const ordinal=ORDINAL.has(baseline.metric),delta=value-baseline.median;
 return {available:true,reason:null,value,baseline:baseline.median,baselineId:baseline.id,absoluteDeviation:Math.abs(delta),signedDeviation:delta,
  percentDeviation:ordinal||baseline.metric==='temp'||baseline.median===0?null:delta/baseline.median*100,
  unusual:!ordinal&&finite(baseline.comparisonThreshold)&&Math.abs(delta)>baseline.comparisonThreshold,
  comparisonThreshold:ordinal?null:baseline.comparisonThreshold,
  direction:delta>0?'higher':delta<0?'lower':'unchanged',clinicalAssessment:false,
  ruleExplanation:ordinal?'Ordinal category comparison; no percentage, MAD alert or diagnosis is generated.':'Descriptive deviation beyond max(3 × 1.4826 × MAD, 2 × input resolution). This prototype heuristic is not a medical threshold.'};
}

export function buildPersonalBaselines(records,options={}){
 const metrics=options.metrics||Object.keys(METRICS);
 return Object.fromEntries(metrics.filter(metric=>METRICS[metric]).map(metric=>[metric,summarizeBaseline(records,{...options,metric})]));
}
