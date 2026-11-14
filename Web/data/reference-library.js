export default {
  "schemaVersion": 1,
  "referenceVersion": "2026.11.13-1",
  "verifiedOn": "2026-11-13",
  "label": "NASA Spaceflight Research Reference Distribution",
  "labelMeaning": "Reference system label; included entries currently contain group summaries only. No observed reference distribution or clinical safety interval is claimed.",
  "containsRawParticipantMeasurements": false,
  "containsSimulatedResearchReferences": false,
  "clinicalSafetyLimits": false,
  "processingPolicy": {
    "combineIncompatibleStudies": false,
    "estimatePercentilesFromMeanSd": false,
    "inferPercentilesFromPlotAxes": false,
    "importIntoPersonalHistory": false
  },
  "entries": [
    {
      "id": "lee-2020-iss-resting-hemodynamics-heart",
      "indicator": "heart",
      "indicatorName": {
        "en": "Heart rate",
        "ar": "معدل ضربات القلب"
      },
      "datasetIdentifier": "doi:10.1152/japplphysiol.00550.2019#table-2",
      "studyTitle": "Arterial structure and function during and after long-duration spaceflight",
      "publication": {
        "year": 2020,
        "journal": "Journal of Applied Physiology",
        "doi": "10.1152/japplphysiol.00550.2019",
        "sourceUrl": "https://journals.physiology.org/doi/full/10.1152/japplphysiol.00550.2019",
        "sourceLocation": "Table 2: Resting hemodynamic parameters; Methods: Subjects and Overall protocol"
      },
      "sourceOrganization": "Peer-reviewed study supported by NASA Human Research Program",
      "population": {
        "cohortSize": 13,
        "men": 10,
        "women": 3,
        "ageYears": {
          "mean": 46,
          "standardDeviation": 8,
          "observedMinimum": 38,
          "observedMaximum": 58
        },
        "missionDurationDays": {
          "mean": 189,
          "standardDeviation": 61,
          "observedMinimum": 126,
          "observedMaximum": 340
        },
        "description": {
          "en": "Thirteen adult astronauts on ISS missions; a selected research cohort, not a reference population for all space travelers.",
          "ar": "١٣ رائد فضاء بالغًا في مهمات المحطة الدولية؛ عينة بحثية مختارة وليست مرجعًا لجميع المسافرين إلى الفضاء."
        }
      },
      "sampleSize": 13,
      "perSummarySampleSize": null,
      "measurementContext": "resting",
      "measurementUnits": "bpm",
      "acquisitionMethod": {
        "id": "resting-hemodynamic-protocol-unverified-heart-sensor",
        "verified": false,
        "description": "Resting hemodynamic measurements. The specific heart-rate acquisition sensor was not independently verified in retrieved methods, so automatic method compatibility is unavailable.",
        "sourceUrl": "https://journals.physiology.org/doi/full/10.1152/japplphysiol.00550.2019",
        "sourceSection": "Methods: Carotid artery measurements"
      },
      "timepoints": [
        {
          "id": "L-180",
          "sourceLabel": "L−180",
          "phase": "preflight",
          "nominalDayRelativeToLaunch": -180
        },
        {
          "id": "L-60",
          "sourceLabel": "L−60",
          "phase": "preflight",
          "nominalDayRelativeToLaunch": -60
        },
        {
          "id": "FD15",
          "sourceLabel": "FD15",
          "phase": "inflight",
          "nominalFlightDay": 15,
          "actualFlightDayWindow": [
            7,
            23
          ]
        },
        {
          "id": "FD60",
          "sourceLabel": "FD60",
          "phase": "inflight",
          "nominalFlightDay": 60,
          "actualFlightDayWindow": [
            54,
            75
          ]
        },
        {
          "id": "late-flight",
          "sourceLabel": "FD180",
          "phase": "inflight",
          "nominalFlightDay": null,
          "methodsNominalFlightDay": 160,
          "actualFlightDayWindow": [
            109,
            194
          ],
          "label": {
            "en": "Late flight",
            "ar": "أواخر الرحلة"
          },
          "sourceDiscrepancy": "Table 2 labels this column FD180; the methods and table legend describe FD160. The discrepancy is preserved, not silently corrected."
        },
        {
          "id": "R+5",
          "sourceLabel": "R+5",
          "phase": "postflight",
          "nominalDayAfterLanding": 5
        }
      ],
      "summaries": [
        {
          "timepoint": "L-180",
          "posture": "seated",
          "mean": 61,
          "standardDeviation": 8
        },
        {
          "timepoint": "L-180",
          "posture": "supine",
          "mean": 57,
          "standardDeviation": 9
        },
        {
          "timepoint": "L-60",
          "posture": "seated",
          "mean": 62,
          "standardDeviation": 11
        },
        {
          "timepoint": "L-60",
          "posture": "supine",
          "mean": 58,
          "standardDeviation": 10
        },
        {
          "timepoint": "FD15",
          "posture": "inflight",
          "mean": 60,
          "standardDeviation": 9
        },
        {
          "timepoint": "FD60",
          "posture": "inflight",
          "mean": 62,
          "standardDeviation": 6
        },
        {
          "timepoint": "late-flight",
          "posture": "inflight",
          "mean": 60,
          "standardDeviation": 7
        },
        {
          "timepoint": "R+5",
          "posture": "seated",
          "mean": 70,
          "standardDeviation": 10
        },
        {
          "timepoint": "R+5",
          "posture": "supine",
          "mean": 64,
          "standardDeviation": 8
        }
      ],
      "statisticalMethod": "published-group-mean-and-standard-deviation",
      "derivedReferenceDistribution": null,
      "percentiles": null,
      "processingMethod": "Factual numerical table cells transcribed from the publisher-indexed Table 2. No individual records, distribution assumptions, pooling or percentile estimation.",
      "limitations": [
        "The article identifies a 13-person cohort; a separate sample size for each selected table cell was not provided in the retrieved table.",
        "Mean ± SD is not an individual healthy range, a confidence interval, or observed minimum–maximum range.",
        "Table 2 labels late flight FD180; methods and legend say FD160; actual collection window109–194days.",
        "Selected ISS cohort does not establish population comparability for an individual."
      ],
      "referenceVersion": "2026.11.13-1",
      "clinicalSafetyLimits": false
    },
    {
      "id": "lee-2020-iss-resting-hemodynamics-sys",
      "indicator": "sys",
      "indicatorName": {
        "en": "Systolic blood pressure",
        "ar": "ضغط الدم الانقباضي"
      },
      "datasetIdentifier": "doi:10.1152/japplphysiol.00550.2019#table-2",
      "studyTitle": "Arterial structure and function during and after long-duration spaceflight",
      "publication": {
        "year": 2020,
        "journal": "Journal of Applied Physiology",
        "doi": "10.1152/japplphysiol.00550.2019",
        "sourceUrl": "https://journals.physiology.org/doi/full/10.1152/japplphysiol.00550.2019",
        "sourceLocation": "Table 2: Resting hemodynamic parameters; Methods: Subjects and Overall protocol"
      },
      "sourceOrganization": "Peer-reviewed study supported by NASA Human Research Program",
      "population": {
        "cohortSize": 13,
        "men": 10,
        "women": 3,
        "ageYears": {
          "mean": 46,
          "standardDeviation": 8,
          "observedMinimum": 38,
          "observedMaximum": 58
        },
        "missionDurationDays": {
          "mean": 189,
          "standardDeviation": 61,
          "observedMinimum": 126,
          "observedMaximum": 340
        },
        "description": {
          "en": "Thirteen adult astronauts on ISS missions; a selected research cohort, not a reference population for all space travelers.",
          "ar": "١٣ رائد فضاء بالغًا في مهمات المحطة الدولية؛ عينة بحثية مختارة وليست مرجعًا لجميع المسافرين إلى الفضاء."
        }
      },
      "sampleSize": 13,
      "perSummarySampleSize": null,
      "measurementContext": "resting",
      "measurementUnits": "mmHg",
      "acquisitionMethod": {
        "id": "dinamap-xl-brachial-cuff",
        "verified": true,
        "description": "Dinamap XL Vital Signs Monitor brachial blood pressure after 5 minutes quiet rest; seated and then repeated after 5 minutes supine rest.",
        "sourceUrl": "https://journals.physiology.org/doi/full/10.1152/japplphysiol.00550.2019",
        "sourceSection": "Methods: Carotid artery measurements"
      },
      "timepoints": [
        {
          "id": "L-180",
          "sourceLabel": "L−180",
          "phase": "preflight",
          "nominalDayRelativeToLaunch": -180
        },
        {
          "id": "L-60",
          "sourceLabel": "L−60",
          "phase": "preflight",
          "nominalDayRelativeToLaunch": -60
        },
        {
          "id": "FD15",
          "sourceLabel": "FD15",
          "phase": "inflight",
          "nominalFlightDay": 15,
          "actualFlightDayWindow": [
            7,
            23
          ]
        },
        {
          "id": "FD60",
          "sourceLabel": "FD60",
          "phase": "inflight",
          "nominalFlightDay": 60,
          "actualFlightDayWindow": [
            54,
            75
          ]
        },
        {
          "id": "late-flight",
          "sourceLabel": "FD180",
          "phase": "inflight",
          "nominalFlightDay": null,
          "methodsNominalFlightDay": 160,
          "actualFlightDayWindow": [
            109,
            194
          ],
          "label": {
            "en": "Late flight",
            "ar": "أواخر الرحلة"
          },
          "sourceDiscrepancy": "Table 2 labels this column FD180; the methods and table legend describe FD160. The discrepancy is preserved, not silently corrected."
        },
        {
          "id": "R+5",
          "sourceLabel": "R+5",
          "phase": "postflight",
          "nominalDayAfterLanding": 5
        }
      ],
      "summaries": [
        {
          "timepoint": "L-180",
          "posture": "seated",
          "mean": 118,
          "standardDeviation": 12
        },
        {
          "timepoint": "L-180",
          "posture": "supine",
          "mean": 116,
          "standardDeviation": 12
        },
        {
          "timepoint": "L-60",
          "posture": "seated",
          "mean": 122,
          "standardDeviation": 17
        },
        {
          "timepoint": "L-60",
          "posture": "supine",
          "mean": 116,
          "standardDeviation": 10
        },
        {
          "timepoint": "FD15",
          "posture": "inflight",
          "mean": 122,
          "standardDeviation": 11
        },
        {
          "timepoint": "FD60",
          "posture": "inflight",
          "mean": 120,
          "standardDeviation": 9
        },
        {
          "timepoint": "late-flight",
          "posture": "inflight",
          "mean": 120,
          "standardDeviation": 9
        },
        {
          "timepoint": "R+5",
          "posture": "seated",
          "mean": 123,
          "standardDeviation": 11
        },
        {
          "timepoint": "R+5",
          "posture": "supine",
          "mean": 117,
          "standardDeviation": 9
        }
      ],
      "statisticalMethod": "published-group-mean-and-standard-deviation",
      "derivedReferenceDistribution": null,
      "percentiles": null,
      "processingMethod": "Factual numerical table cells transcribed from the publisher-indexed Table 2. No individual records, distribution assumptions, pooling or percentile estimation.",
      "limitations": [
        "The article identifies a 13-person cohort; a separate sample size for each selected table cell was not provided in the retrieved table.",
        "Mean ± SD is not an individual healthy range, a confidence interval, or observed minimum–maximum range.",
        "Table 2 labels late flight FD180; methods and legend say FD160; actual collection window109–194days.",
        "Selected ISS cohort does not establish population comparability for an individual."
      ],
      "referenceVersion": "2026.11.13-1",
      "clinicalSafetyLimits": false
    },
    {
      "id": "lee-2020-iss-resting-hemodynamics-dia",
      "indicator": "dia",
      "indicatorName": {
        "en": "Diastolic blood pressure",
        "ar": "ضغط الدم الانبساطي"
      },
      "datasetIdentifier": "doi:10.1152/japplphysiol.00550.2019#table-2",
      "studyTitle": "Arterial structure and function during and after long-duration spaceflight",
      "publication": {
        "year": 2020,
        "journal": "Journal of Applied Physiology",
        "doi": "10.1152/japplphysiol.00550.2019",
        "sourceUrl": "https://journals.physiology.org/doi/full/10.1152/japplphysiol.00550.2019",
        "sourceLocation": "Table 2: Resting hemodynamic parameters; Methods: Subjects and Overall protocol"
      },
      "sourceOrganization": "Peer-reviewed study supported by NASA Human Research Program",
      "population": {
        "cohortSize": 13,
        "men": 10,
        "women": 3,
        "ageYears": {
          "mean": 46,
          "standardDeviation": 8,
          "observedMinimum": 38,
          "observedMaximum": 58
        },
        "missionDurationDays": {
          "mean": 189,
          "standardDeviation": 61,
          "observedMinimum": 126,
          "observedMaximum": 340
        },
        "description": {
          "en": "Thirteen adult astronauts on ISS missions; a selected research cohort, not a reference population for all space travelers.",
          "ar": "١٣ رائد فضاء بالغًا في مهمات المحطة الدولية؛ عينة بحثية مختارة وليست مرجعًا لجميع المسافرين إلى الفضاء."
        }
      },
      "sampleSize": 13,
      "perSummarySampleSize": null,
      "measurementContext": "resting",
      "measurementUnits": "mmHg",
      "acquisitionMethod": {
        "id": "dinamap-xl-brachial-cuff",
        "verified": true,
        "description": "Dinamap XL Vital Signs Monitor brachial blood pressure after 5 minutes quiet rest; seated and then repeated after 5 minutes supine rest.",
        "sourceUrl": "https://journals.physiology.org/doi/full/10.1152/japplphysiol.00550.2019",
        "sourceSection": "Methods: Carotid artery measurements"
      },
      "timepoints": [
        {
          "id": "L-180",
          "sourceLabel": "L−180",
          "phase": "preflight",
          "nominalDayRelativeToLaunch": -180
        },
        {
          "id": "L-60",
          "sourceLabel": "L−60",
          "phase": "preflight",
          "nominalDayRelativeToLaunch": -60
        },
        {
          "id": "FD15",
          "sourceLabel": "FD15",
          "phase": "inflight",
          "nominalFlightDay": 15,
          "actualFlightDayWindow": [
            7,
            23
          ]
        },
        {
          "id": "FD60",
          "sourceLabel": "FD60",
          "phase": "inflight",
          "nominalFlightDay": 60,
          "actualFlightDayWindow": [
            54,
            75
          ]
        },
        {
          "id": "late-flight",
          "sourceLabel": "FD180",
          "phase": "inflight",
          "nominalFlightDay": null,
          "methodsNominalFlightDay": 160,
          "actualFlightDayWindow": [
            109,
            194
          ],
          "label": {
            "en": "Late flight",
            "ar": "أواخر الرحلة"
          },
          "sourceDiscrepancy": "Table 2 labels this column FD180; the methods and table legend describe FD160. The discrepancy is preserved, not silently corrected."
        },
        {
          "id": "R+5",
          "sourceLabel": "R+5",
          "phase": "postflight",
          "nominalDayAfterLanding": 5
        }
      ],
      "summaries": [
        {
          "timepoint": "L-180",
          "posture": "seated",
          "mean": 74,
          "standardDeviation": 9
        },
        {
          "timepoint": "L-180",
          "posture": "supine",
          "mean": 69,
          "standardDeviation": 7
        },
        {
          "timepoint": "L-60",
          "posture": "seated",
          "mean": 76,
          "standardDeviation": 8
        },
        {
          "timepoint": "L-60",
          "posture": "supine",
          "mean": 70,
          "standardDeviation": 7
        },
        {
          "timepoint": "FD15",
          "posture": "inflight",
          "mean": 73,
          "standardDeviation": 9
        },
        {
          "timepoint": "FD60",
          "posture": "inflight",
          "mean": 72,
          "standardDeviation": 8
        },
        {
          "timepoint": "late-flight",
          "posture": "inflight",
          "mean": 74,
          "standardDeviation": 8
        },
        {
          "timepoint": "R+5",
          "posture": "seated",
          "mean": 74,
          "standardDeviation": 5
        },
        {
          "timepoint": "R+5",
          "posture": "supine",
          "mean": 69,
          "standardDeviation": 6
        }
      ],
      "statisticalMethod": "published-group-mean-and-standard-deviation",
      "derivedReferenceDistribution": null,
      "percentiles": null,
      "processingMethod": "Factual numerical table cells transcribed from the publisher-indexed Table 2. No individual records, distribution assumptions, pooling or percentile estimation.",
      "limitations": [
        "The article identifies a 13-person cohort; a separate sample size for each selected table cell was not provided in the retrieved table.",
        "Mean ± SD is not an individual healthy range, a confidence interval, or observed minimum–maximum range.",
        "Table 2 labels late flight FD180; methods and legend say FD160; actual collection window109–194days.",
        "Selected ISS cohort does not establish population comparability for an individual."
      ],
      "referenceVersion": "2026.11.13-1",
      "clinicalSafetyLimits": false
    },
    {
      "id": "barger-2014-iss-actigraphy-sleep",
      "indicator": "sleep",
      "indicatorName": {
        "en": "Sleep duration",
        "ar": "مدة النوم"
      },
      "datasetIdentifier": "doi:10.1016/S1474-4422(14)70122-X#iss-sleep-duration",
      "studyTitle": "Prevalence of sleep deficiency and use of hypnotic drugs in astronauts before, during, and after spaceflight: an observational study",
      "publication": {
        "year": 2014,
        "journal": "The Lancet Neurology",
        "doi": "10.1016/S1474-4422(14)70122-X",
        "sourceUrl": "https://pubmed.ncbi.nlm.nih.gov/25127232/",
        "fullTextUrl": "https://pmc.ncbi.nlm.nih.gov/articles/PMC4188436/",
        "sourceLocation": "Original publication abstract and ISS actigraphy summaries; Tables1–2 distinguish raw means/SD from modeled p-values."
      },
      "sourceOrganization": "NASA-supported human astronaut research; original peer-reviewed publication",
      "supportingNasaUrl": "https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-041-sleep-accommodations.pdf",
      "population": {
        "cohortSize": 21,
        "platform": "International Space Station",
        "missions": 13,
        "inflightDataCollectionDaysReported": 3248,
        "description": {
          "en": "21 ISS astronauts on 13 missions. This library uses only the ISS subgroup and does not pool Space Shuttle results.",
          "ar": "٢١ رائد فضاء على ١٣ مهمة بالمحطة الدولية. المكتبة تستخدم مجموعة ISS فقط ولا تدمج نتائج المكوك."
        }
      },
      "sampleSize": 21,
      "perSummarySampleSize": null,
      "measurementContext": "sleep",
      "measurementUnits": "h",
      "acquisitionMethod": {
        "id": "wrist-actigraphy",
        "verified": true,
        "description": "Objective wrist actigraphy; sleep duration obtained per night. Daily logs and medication records were collected separately.",
        "sourceUrl": "https://pubmed.ncbi.nlm.nih.gov/25127232/"
      },
      "timepoints": [
        {
          "id": "SL-90",
          "phase": "preflight",
          "sourceLabel": "SL-90",
          "description": "Two-week interval scheduled approximately three months before launch."
        },
        {
          "id": "L-11",
          "phase": "preflight",
          "sourceLabel": "L-11",
          "relativeDayWindow": [
            -11,
            -1
          ]
        },
        {
          "id": "inflight",
          "phase": "inflight",
          "sourceLabel": "ISS in-flight",
          "nominalFlightDay": null
        },
        {
          "id": "R+1-to-7",
          "phase": "postflight",
          "sourceLabel": "First week post-mission",
          "dayAfterLandingWindow": [
            1,
            7
          ]
        }
      ],
      "summaries": [
        {
          "timepoint": "SL-90",
          "posture": "not-applicable",
          "mean": 6.41,
          "standardDeviation": 0.65
        },
        {
          "timepoint": "L-11",
          "posture": "not-applicable",
          "mean": 5.86,
          "standardDeviation": 0.94
        },
        {
          "timepoint": "inflight",
          "posture": "not-applicable",
          "mean": 6.09,
          "standardDeviation": 0.67
        },
        {
          "timepoint": "R+1-to-7",
          "posture": "not-applicable",
          "mean": 6.95,
          "standardDeviation": 1.04
        }
      ],
      "statisticalMethod": "published-group-mean-and-standard-deviation",
      "derivedReferenceDistribution": null,
      "percentiles": null,
      "processingMethod": "Transcribed four exact ISS subgroup mean/SD values from the original publication abstract, cross-checked with NASA Sleep Accommodations technical brief. No modeled distribution, aggregation across incompatible studies or reconstructed values from plots.",
      "limitations": [
        "Cohort N21 is not a per-phase sample size; per-summary N is not established here.",
        "Observed sleep restriction describes a problem; it is not an adequate-sleep recommendation.",
        "Self-reported sleep duration is not automatically method-compatible with actigraphy.",
        "No numerical participant-level data were downloaded; percentiles cannot be computed."
      ],
      "referenceVersion": "2026.11.13-1",
      "clinicalSafetyLimits": false
    }
  ],
  "unavailableIndicators": [
    {
      "indicator": "oxygen",
      "status": "insufficient-published-data",
      "message": "NASA Spaceflight Reference: Insufficient Published Data",
      "reason": "Inspiration4 has published wearable plots and reported collection failures for two crew; validated numerical reference observations were not retrieved.",
      "candidateSourceUrl": "https://www.nature.com/articles/s41586-024-07648-x"
    },
    {
      "indicator": "temp",
      "status": "insufficient-published-data",
      "message": "NASA Spaceflight Reference: Insufficient Published Data",
      "reason": "Core-temperature research exists, but compatible numerical phase-specific reference tables were not independently extracted. Oral/skin readings cannot be equated with core temperature.",
      "candidateSourceUrl": "https://www.nature.com/articles/s41598-017-15560-w"
    },
    {
      "indicator": "hrv",
      "status": "insufficient-published-data",
      "message": "NASA Spaceflight Reference: Insufficient Published Data",
      "reason": "Spaceflight HRV evidence exists, but compatible numeric RMSSD/SDNN reference observations, acquisition windows and processing were not validated for inclusion.",
      "candidateSourceUrl": "https://osdr.nasa.gov/"
    },
    {
      "indicator": "glucose",
      "status": "insufficient-published-data",
      "message": "NASA Spaceflight Reference: Insufficient Published Data",
      "reason": "NASA OSD-575 contains serum assays; no suitable verified numeric phase-specific glucose reference was extracted for this library.",
      "candidateSourceUrl": "https://osdr.nasa.gov/bio/repo/data/studies/OSD-575"
    },
    {
      "indicator": "mood",
      "status": "insufficient-published-data",
      "message": "NASA Spaceflight Reference: Insufficient Published Data",
      "reason": "No compatible validated reference for this application’s personal ordinal scale was loaded.",
      "candidateSourceUrl": null
    },
    {
      "indicator": "energy",
      "status": "insufficient-published-data",
      "message": "NASA Spaceflight Reference: Insufficient Published Data",
      "reason": "No compatible validated reference for this application’s personal ordinal scale was loaded.",
      "candidateSourceUrl": null
    },
    {
      "indicator": "eda",
      "status": "insufficient-published-data",
      "message": "NASA Spaceflight Reference: Insufficient Published Data",
      "reason": "No compatible validated numeric human spaceflight EDA reference was loaded.",
      "candidateSourceUrl": null
    }
  ],
  "investigatedSources": [
    {
      "name": "NASA OSDR",
      "url": "https://osdr.nasa.gov/",
      "result": "OSD-575 metadata retained separately; no compatible numerical personal-vital-sign reference imported."
    },
    {
      "name": "NASA Spaceflight Standard Measures",
      "url": "https://www.nasa.gov/hrp/",
      "result": "Research context investigated; no accessible compatible individual-reference dataset extracted."
    },
    {
      "name": "NASA Life Sciences/NTRS archive",
      "url": "https://ntrs.nasa.gov/",
      "result": "NASA educational summaries cross-check sleep research. Archive descriptions are not individual numerical datasets."
    },
    {
      "name": "NASA Human Research Program publications",
      "url": "https://www.nasa.gov/hrp/",
      "result": "Existing Lee2020 study supported by NASA HRP; numerical group summaries preserved."
    }
  ]
};
