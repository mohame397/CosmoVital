# Personal baselines and explainable trend methodology

The baseline and trend rules are transparent prototype software rules. Their numerical sufficiency criteria, robust-deviation bands and trend categories have **not** been clinically validated for astronauts. They do not establish medical safety, diagnosis, causation or fitness for duty.

## Inputs and separation

The source of truth remains the user's validated historical observations. Units are canonical in the data model: bpm, %, mmHg, °C, mg/dL, hours, ms and the documented ordinal scales. Missing values remain missing. Timestamps are ISO 8601 instants; analysis-day grouping uses UTC so changing the display time zone does not silently change the baseline sample.

Real and simulated workspaces are separate. Real baselines exclude simulation, training, synthetic and demo flags. Demo analysis accepts only explicitly simulated records. Research group statistics are never imported into personal history. Original records, source tags and context are retained; analysis creates derived results rather than overwriting historical readings.

The baseline engine rejects invalid values and timestamps, conflicting record identifiers, duplicate observations, measurements at or after the analysis instant, the selected current observation, incompatible activity contexts and unstable signals. Device-based indicators require known device and method. Temperature also requires acquisition site; glucose requires meal context; HRV requires its statistic/method. Mixed acquisition strata return insufficient rather than being silently pooled.

## Three baseline periods

| Baseline | Inclusion period | Interpretation |
|---|---|---|
| Preflight | Before mission start, and before the analysis instant | Its time window is fixed at mission start. Later in-flight observations do not replace it. Corrections to eligible historical records can legitimately change its derived snapshot. |
| Early mission | From mission start to the end of the configured adaptation window; default seven days | The window must be complete before this baseline is established. It remains distinguishable from preflight. |
| Rolling in-flight | The preceding configured 7–14 days, limited to times after mission start and before the current observation | A provisional descriptive history that can adapt. It is not an acceptance of persistent abnormality or a replacement for fixed baselines. |

A mission start is required to distinguish these periods. Without it, the application returns an explicit unavailable/insufficient result rather than inventing a launch date. The early-mission window supports 1–30 days in the engine; the rolling window supports 7–14 days.

## Sufficiency and statistics

A baseline requires **at least five unique valid observations on at least three distinct UTC dates** within one compatible context/acquisition stratum. These are application evidence requirements, not a NASA clinical standard.

For continuous measurements:

- The center is the sample **median**.
- **MAD** is the median absolute deviation from that median; a scaled descriptive MAD uses factor 1.4826.
- The displayed historical interval is empirical **p10–p90**, with linear interpolation between observed sample values. The minimum, maximum, sample count, dates, included record IDs and exclusions remain available.
- This historical interval describes the data. It is neither a population research distribution nor a healthy range.
- A descriptive unusual-deviation flag is set when the absolute difference exceeds `max(3 × 1.4826 × MAD, 2 × input resolution)`. The resolution floor prevents a zero-MAD history from turning every tiny change into a large standardized claim.
- Signed and absolute deviations are retained. Percentage deviation is omitted when the median is zero, for Celsius temperature, and for ordinal indicators.

Mood and energy use an ordinal-category median, observed category bounds and category frequencies. The software does not calculate a medical percentage change or a continuous MAD alarm for those ordinal categories.

Observations generating an existing **urgent** general safety prompt are excluded from baseline construction; this conservative exclusion can affect all indicators in the same observation. Nonurgent review observations can remain descriptive data but mark the result provisional. Counts and reasons are visible. Exclusion does not resolve the warning or prove that the remaining observations are safe.

The derived snapshot identifies the algorithm version, period, context and supporting records. Historical records remain the durable evidence; reanalysis can be reproduced from them. Corrections or deletions must invalidate the affected comparison, rather than combining a new observation with an old result.

## Independent three-layer evaluation

**Layer A — General medical safety.** Existing documented, broad adult terrestrial reference prompts are retained. They are not relabeled as astronaut-specific thresholds. An urgent review requirement has priority; a missing prompt does not establish health. Symptoms and approved mission procedures take priority over software results.

**Layer B — NASA Spaceflight Research Reference Distribution.** The versioned library checks available source data, activity, method, posture, phase, units and limitations. Current bundled studies provide **mean ± SD summaries**, not participant-level percentile distributions. A compatible summary may support a descriptive difference from the group mean; it cannot produce an authentic within/outside percentile-range classification. Incompatible or unsupported comparisons return unavailable. The engine supports a future documented observed distribution; tests using explicit synthetic fixtures exercise those branches without representing those fixtures as NASA data.

**Layer C — Personal baseline.** The selected comparable baseline and its data sufficiency determine whether a descriptive personal deviation is available. General safety prompts remain active even when a reading resembles the individual's history.

No weighted or averaged risk score combines the layers. A medical review prompt cannot be cancelled by research compatibility or a familiar personal pattern. Personal monitoring remains possible when research is unavailable.

## Longitudinal detection

Supported inspection periods are **24 hours, seven days, 14 days and 30 days**. The engine groups compatible valid observations and computes actual daily medians, preserving original measurements. Missing days are not filled. Multiple readings on one date do not count as multiple independent days of longitudinal evidence.

A longitudinal interpretation needs at least three unique measurements across three UTC dates. A 24-hour view therefore normally returns **Insufficient Data** for a multiday trend; it still exposes the independent safety assessment and observed readings. This is a deliberate evidence requirement rather than a claim that a one-day record cannot matter clinically.

The review rules inspect the latest three available UTC daily summaries. A fixed analysis baseline is calculated as of the first analyzed observation, so readings within the analyzed episode cannot silently become their own reference. A meaningful monotone change requires at least `max(2 × input resolution, 2 × scaled MAD)` absolute movement. When the baseline is unavailable, the engine uses only its documented resolution floor and preserves the limitation.

| Category | Software interpretation |
|---|---|
| Stable | Sufficient comparable data with no implemented review pattern. Does not mean medically safe. |
| Improving | The recent continuous measurements move toward the recorded baseline by the implemented descriptive rule. Does not establish recovery. |
| Needs Attention | An urgent safety reference applies, existing review prompts repeat on at least three dates, or the explicitly labeled repeated-low-energy self-report rule applies. |
| Review Recommended | Persistent unusual personal deviations or a meaningful sustained change under the metric-specific descriptive rule. |
| Insufficient Data | Evidence, context or a compatible personal baseline is insufficient for the relevant interpretation. |

The prototype flags increases/decreases for relevant continuous metrics and downward sleep/SpO₂/mood/energy patterns. HRV change is interpreted relative to compatible individual history, not as a universal disease threshold. Repeated energy scores of two or below are an application self-report review rule, not a validated fatigue diagnosis.

Declining sleep and decreasing or baseline-reduced self-reported energy on at least three overlapping dates can be shown together. This is **temporal co-occurrence**, not a claim that one caused the other.

## Explainability, deduplication and reports

Each trend retains the indicator, current observation, period, context/acquisition stratum, baseline, research result, general safety assessment, actual supporting records, daily summaries, explanation and non-diagnostic follow-up. The trend identifier binds the rule version, metric/context/method/posture group, period and pattern kind; a new latest timestamp alone does not create another notification identity. Interface review state is organizational, not proof of medical resolution.

JSON handovers state `deliveryStatus: not-sent` and `clinicalAssessment: false`. Exporting, acknowledging or completing questions does not contact a doctor or certify recovery. The local storage limitations and medical limitations remain applicable.

## Reproducibility

Implementation is in `dist/personal-baselines.js`, `dist/health-evaluation.js` and `dist/research-library.js`. Actual regression results are delivered under `qa/`; rerun the final source's test command after modifying a rule. See [the reference documentation](NASA_REFERENCE_LIBRARY.md), [screening sources](SCREENING.md), and [readiness checklist](FINAL_READINESS.md).
