# CosmoVital — Project overview

**Challenge:** Create Health Monitoring Software for Astronauts on Space Missions  
**Event presentation:** NASA Space Apps Challenge — November 14–15, 2026  
**Product:** An Arabic/English, offline-capable health observation and decision-support prototype.

## Problem

Long missions expose crews to altered gravity, isolation, radiation, distance from Earth and a closed environment. A single physiological measurement rarely explains what is happening. A population reference cannot describe an individual's usual pattern, while an individual's familiar pattern cannot establish medical safety. Delayed communication makes clear local records and interpretable follow-up particularly useful.

NASA's [five hazards of human spaceflight](https://www.nasa.gov/hrp/hazards/) provide the mission context. CosmoVital does not claim to measure the biological effects of all five hazards from ordinary vital signs.

## Proposed solution

CosmoVital keeps three questions separate:

1. **General medical safety:** Does an existing, source-linked adult reference prompt warrant review? This protective layer remains independent of every baseline.
2. **Spaceflight research:** Is a published human-spaceflight reference scientifically compatible with the measurement? The library retains source, cohort, method, phase, units and uncertainty. A group mean and standard deviation are not converted into a healthy or observed percentile interval.
3. **Personal history:** Is the measurement different from the individual's comparable preflight, early-mission or rolling history? The software uses robust descriptive statistics and explains when evidence is insufficient.

A longitudinal engine assembles repeated observations into traceable trend reviews. It does not calculate a combined risk score or diagnose a disease. Follow-up questions and case exports retain the original measurements and their context for human review.

## Central innovation

The **Dual-Baseline Astronaut Health Monitoring System** relates personal history to an independently attributed spaceflight research library, while retaining a separate medical-safety layer. An unavailable research distribution is a visible result rather than an invitation to invent a range. Personal monitoring continues when no comparable NASA reference exists.

This is a product positioning statement, not a claim of world-first novelty, validated diagnostic performance, NASA endorsement or competition eligibility.

## Intended users and use

The prototype supports an astronaut/crew-member demonstration and health-awareness workflows. A local workspace can retain observations, charts, questionnaires, organizational cases and handover exports without an internet connection. It does not establish a real flight medical service or authorize operational use aboard a spacecraft.

## Existing application retained

The upgrade builds on the supplied CosmoVital application. It preserves manual logging, historical charts, measurement correction and import, source-linked prompts, emergency education, Decision Tree questionnaires, case/consultation organization, Body Insights, research exploration, local backups and Arabic/English localization. The release does not require cloud authentication, Supabase, Firebase or a database server.

## Technology

| Layer | Implementation |
|---|---|
| Interface | HTML, CSS and browser JavaScript ES modules |
| Persistent local workspace | Browser LocalStorage, with validation and explicit backup/restore |
| Research references | Versioned bundled local JSON/JavaScript catalogs |
| Health analysis | Deterministic, explainable JavaScript rules and robust descriptive statistics |
| Offline delivery | Self-contained HTML; static website with cached application assets |
| Build tool | esbuild, used at development/build time |
| Tests | Direct Node test files and package-integrity checks; browser results reported separately |
| Hosting | Static hosting such as Vercel; no runtime backend required |

## Limits

Browser storage is not encrypted medical-grade storage. Clearing browser data, changing origin/browser/file path, private mode or device loss may remove access to records. People using the same browser workspace may see the same information. Exports contain plaintext health data.

The prototype does not collect wearable data automatically, measure radiation dose without a valid source, prescribe medication, diagnose disease, certify fitness for duty or confirm transmission to medical personnel. Mission communication delays and demo crew records are explicitly simulated. See [the methodology](BASELINE_TRENDS_METHOD.md), [scientific sources](NASA_REFERENCE_LIBRARY.md), [medical references](SCREENING.md) and [final readiness](FINAL_READINESS.md).
