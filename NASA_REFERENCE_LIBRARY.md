# Versioned spaceflight research reference library

Version: **2026.11.13-1**, verified 13 November 2026. The local library is stored in `dist/data/reference-library.json` and its matching ES module. `dist/research-library.js` matches recorded context to an included study. No external service is required at runtime.

The interface uses the requested label **NASA Spaceflight Research Reference Distribution** for the reference system. **This release contains published group summaries, not an observed individual reference distribution.** Every included entry therefore has `derivedReferenceDistribution: null`, `percentiles: null` and `clinicalSafetyLimits: false`. It cannot classify a reading as inside or outside a participant distribution. Neither research summaries nor personal baselines override the independent medical-reference layer.

## Numerical evidence actually included

| Study | Numerical cells | Population | Method and context | Reference data |
|---|---:|---|---|---|
| Lee et al., 2020, *Journal of Applied Physiology*, DOI `10.1152/japplphysiol.00550.2019`, Table 2 | 27: nine each for heart rate, systolic and diastolic BP | 13 adult ISS astronauts, 10 men/3 women; mean age46±8 years; missions126–340days | Quiet resting hemodynamic protocol, seated and supine before/after flight and in microgravity in flight | Published mean±SD; bpm or mmHg |
| Barger et al., 2014, *The Lancet Neurology*, DOI `10.1016/S1474-4422(14)70122-X` | 4 ISS sleep-duration summaries | 21 ISS astronauts on13missions; Space Shuttle subgroup is excluded | Objective wrist actigraphy, sleep obtained per night | Published mean±SD in hours |

Sources:

- [Lee original publication and methods](https://journals.physiology.org/doi/full/10.1152/japplphysiol.00550.2019). The primary publisher's indexed Table2 and methods were inspected; direct full-page retrieval can return403. Factual numerical cells were transcribed with source attribution; no article text, figures or raw participant records are redistributed.
- [Barger original publication abstract, PMID25127232](https://pubmed.ncbi.nlm.nih.gov/25127232/), [full author manuscript](https://pmc.ncbi.nlm.nih.gov/articles/PMC4188436/). The original numerical abstract and indexed article were inspected; direct PMC access encountered a CAPTCHA. [NASA Sleep Accommodations technical brief](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-041-sleep-accommodations.pdf) independently reproduces the sleep findings.

The ISS actigraphy summaries are: approximately three months before launch **6.41±0.65h**; the11days before launch **5.86±0.94h**; in flight **6.09±0.67h**; first week post-mission **6.95±1.04h**. These observations document sleep restriction. They are **not recommendations for sufficient sleep**. The21-person cohort size is not silently assigned to every phase-specific cell.

## Acquisition and matching

Lee's methods specify a **Dinamap XL Vital Signs Monitor** for brachial blood pressure after five minutes of quiet seated rest; measurements were repeated after five minutes of quiet supine rest. The original specific heart-rate acquisition sensor was not independently established from the retrieved method text. Therefore, this release displays the sourced HR statistics but does **not** assert automatic HR method compatibility.

BP matching requires a recorded Dinamap protocol/device, resting context, compatible posture, phase and actual acquisition window, plus explicit context review. A different cuff or wearable is not silently treated as equivalent. Sleep matching requires actual actigraphy rather than simply any self-reported sleep duration. These restrictions describe software evidence requirements and do not certify sensor accuracy.

In-flight hemodynamic acquisition windows are flight days7–23,54–75 and109–194. The last timepoint contains a source discrepancy: Table2 labels the column **FD180**, while methods/legend identify **FD160**. The library preserves the original label and the discrepancy. Preflight L−180/L−60 are original nominal timepoints; no unpublished tolerance interval is invented. The app must not assign an arbitrary preflight reading to one of them.

Mission-day calculation uses UTC elapsed days from the configured mission start. A selected research phase cannot override a conflicting recorded phase or known actual day. Launch time does not establish landing time; a postflight source phase must be identified explicitly. No current measurement date is substituted for an unknown historical acquisition timestamp.

The matcher returns:

- `summary-only`: recorded context/method/phase support a descriptive group-summary comparison; `distribution` remains null. It can display a difference from the published mean, without a healthy/danger classification.
- `unavailable`: context, phase, posture, method, quality or numerical reference is insufficient. An `availableGroupSummary` may remain visible for education; it is not a successful personal match.
- `comparable-distribution` is reserved for future verified individual-distribution data and is not produced from this library's mean±SD cells.

Unknown acquisition metadata stays unknown. Unstable signals are ineligible for automated research matching. Individual population comparability remains unestablished even after a protocol-compatible match. Simulated and real observations are accepted only in their respective workspaces; simulation does not change the authenticity of the research reference.

## Distribution processing and uncertainty

No participant-level numerical observations were downloaded for these studies. Consequently, no5th–95thpercentiles or minimum–maximum individual reference interval can be calculated. Assuming normality and multiplying SD would produce a modeled interval with unsupported assumptions; this release does not do that. Means±SD are preserved exactly, with no incompatible study pooling, plot-axis extraction or synthesized missing records.

Dataset identifiers in this library are **publication/table identifiers**, not invented OSDR accessions. The included numbers are research facts from NASA-supported studies. The system does not claim NASA approval, individual medical safety or flight certification.

## Investigated but unavailable references

- **NASA OSDR and OSD-575:** genuine Inspiration4 serum-assay metadata, retained separately. It is not a live heart-rate/SpO₂ feed, and no compatible numeric glucose distribution was extracted. [NASA OSDR](https://osdr.nasa.gov/), [OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575).
- **Spaceflight Standard Measures, NASA HRP and life-sciences/NTRS archives:** investigated for accessible human physiological data. No additional compatible participant reference file was validated for inclusion. Educational and study-description pages are not relabeled as numerical measurement files.
- **SpO₂:** the Inspiration4 publication includes wearable data and collection limitations affecting two crew members, but a suitable numerical reference distribution was not retrieved. Plot axes are not reference bounds. [Original study](https://www.nature.com/articles/s41586-024-07648-x).
- **Temperature:** actual core-temperature spaceflight studies exist; a compatible numeric phase-specific reference table was not extracted. Oral/skin readings cannot be substituted for core temperature. [Stahn et al.,2017](https://www.nature.com/articles/s41598-017-15560-w).
- **HRV:** a compatible numerical RMSSD/SDNN distribution with verified acquisition interval and processing was not established. Different HRV definitions cannot be combined.
- **Mood, energy and EDA:** no compatible numerical spaceflight research reference for the application's indicators was loaded.

These indicators display **NASA Spaceflight Reference: Insufficient Published Data**. Personal monitoring continues independently.

## Environmental standards are separate

The existing NASA-STD-3001 Volume2 RevisionF cabin reference remains available in the Space references section. Inspired oxygen, cabin CO₂ and cabin pressure requirements are environmental quantities. They do not establish HR, BP, SpO₂ or personal radiation-dose limits, and they are not combined with physiological research statistics. See `SPACE_REFERENCES_AR.md` for environmental qualifiers and original sources.

## Executed checks

`node tests/research-library.test.mjs`: **18tests passed** when this module was completed. Tests cover JSON/ES-module equality, all31summary cells, source metadata, exact known values, acquisition windows, conflicting phases, incompatible contexts/methods, missing HR sensor verification, real/demo separation, invalid readings, unavailable indicators, sleep subgroup values and immutable matching results. These are software/source-integrity checks, not independent clinical validation or browser testing.
