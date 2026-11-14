export default {
  "schemaVersion": 1,
  "id": "nasa-space-environment-standards",
  "kind": "published-environmental-design-standard",
  "verifiedOn": "2026-11-13",
  "standard": {
    "id": "NASA-STD-3001 Volume 2",
    "revision": "F",
    "approvedAt": "2026-07-14",
    "status": "ACTIVE",
    "organization": "NASA Office of the Chief Health and Medical Officer",
    "landingUrl": "https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_2",
    "url": "https://standards.nasa.gov/system/files/tmp/NASA-STD-3001%20Vol%202%20Rev%20F.pdf",
    "mirrorUrl": "https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf",
    "htmlOverviewUrl": "https://www.nasa.gov/reference/6-0-natural-and-induced-environments-vol-2/",
    "pageNumbering": "Page references follow the 389-page PDF on standards.nasa.gov; mirror pagination differs."
  },
  "scope": {
    "en": "Cabin atmosphere reference. PIO₂ is inspired gas pressure, not blood SpO₂. Environmental comparisons do not establish personal clinical safety.",
    "ar": "مرجع لجو المقصورة. PIO₂ ضغط الأكسجين المستنشق وليس تشبّع الدم SpO₂. مقارنة البيئة لا تحدد أمان الحالة الصحية للفرد.",
    "implementedContext": "pressurized-cabin",
    "requiresMeasuredEnvironmentalInputs": true,
    "noDefaultMeasuredValues": true,
    "noSpO2Conversion": true,
    "clinicalVitalSignThresholdsDerived": false,
    "riskPercentDerived": false,
    "unsupportedCalculatorContexts": [
      "EVA",
      "spacesuit",
      "prebreathe",
      "DCS-treatment",
      "ascent",
      "entry",
      "landing",
      "post-landing"
    ],
    "unsupportedClinicalMetrics": [
      "heart-rate",
      "blood-pressure",
      "SpO2",
      "blood-glucose",
      "body-temperature",
      "HRV",
      "EDA"
    ],
    "medicalAction": "Follow reviewed mission procedures and qualified medical oversight."
  },
  "quantities": [
    {
      "id": "inspired-oxygen",
      "symbol": "PIO2",
      "unit": "mmHg",
      "source": {
        "requirement": "V2 6003",
        "table": "6.2-1",
        "page": 51,
        "url": "https://standards.nasa.gov/system/files/tmp/NASA-STD-3001%20Vol%202%20Rev%20F.pdf#page=51"
      },
      "formula": {
        "expression": "(PB_mmHg - 47) * FiO2",
        "barometricPressureUnit": "mmHg",
        "oxygenInput": "dry-gas decimal fraction",
        "waterVaporCorrection_mmHg": 47,
        "oxygenPercentToFractionDivisor": 100
      },
      "nominalTarget": {
        "minimum": 145,
        "maximum": 155,
        "minimumInclusive": true,
        "maximumInclusive": true,
        "duration": "indefinite",
        "classification": "nominal-target-only"
      },
      "mildHypoxiaReference": {
        "oneHourTimeWeightedAverageMinimum": 127,
        "instantaneousAbsoluteMinimum": 122,
        "averagingWindowMinutes": 60,
        "duration": "indefinite-with-monitoring",
        "requiresMissionMonitoringAndMitigationPlan": true,
        "notAutomaticSafeBand": true
      },
      "specializedExposureReferences": [
        {
          "id": "indefinite-hyperoxia",
          "maximum": 356,
          "unit": "mmHg",
          "duration": "indefinite",
          "examples": [
            "EVA",
            "cabin-depressurization-in-suit-survival"
          ],
          "calculatorEnabled": false
        },
        {
          "id": "short-term-hyperoxia",
          "maximum": 791,
          "unit": "mmHg",
          "examples": [
            "EVA-prebreathe"
          ],
          "maximumExposureHours": {
            "onlyEnrichedOxygenExposureIn48Hours": 9,
            "onlyEnrichedOxygenExposureIn24Hours": 6,
            "maximumConsecutiveDailyExposures": 5
          },
          "DcsTreatmentMayExceedLimit": true,
          "calculatorEnabled": false
        }
      ],
      "singleReadingCannotEstablishOneHourAverage": true,
      "outsideNominalTargetDoesNotMeanDiagnosedDanger": true
    },
    {
      "id": "cabin-carbon-dioxide",
      "symbol": "ppCO2",
      "unit": "mmHg",
      "source": {
        "requirement": "V2 6004",
        "section": "6.2.1.3",
        "page": 51,
        "url": "https://standards.nasa.gov/system/files/tmp/NASA-STD-3001%20Vol%202%20Rev%20F.pdf#page=51"
      },
      "nominalLimit": {
        "maximum": 3,
        "maximumInclusive": true,
        "averagingWindowMinutes": 60,
        "aggregation": "one-hour-average",
        "context": "habitable-volume"
      },
      "singleReadingCannotEstablishOneHourAverage": true,
      "offNominalLimits": "mission-specific-not-published-in-this-standard",
      "notExhaledCarbonDioxide": true
    },
    {
      "id": "cabin-pressure",
      "symbol": "PB",
      "unit": "kPa",
      "source": {
        "requirement": "V2 6006",
        "section": "6.2.2.1",
        "page": 52,
        "url": "https://standards.nasa.gov/system/files/tmp/NASA-STD-3001%20Vol%202%20Rev%20F.pdf#page=52"
      },
      "range": {
        "minimum": 34.5,
        "maximum": 103,
        "minimumInclusive": false,
        "maximumInclusive": true,
        "duration": "indefinite-exposure"
      },
      "publishedPsiaRange": {
        "minimum": 5,
        "maximum": 15,
        "minimumInclusive": false,
        "maximumInclusive": true
      },
      "mustAlsoAssess": [
        "inspired-oxygen",
        "cabin-carbon-dioxide",
        "diluent-gas"
      ],
      "limitedSuitOperationsMayHaveDifferentLimits": true
    },
    {
      "id": "diluent-gas",
      "unit": "percent",
      "source": {
        "requirement": "V2 6002",
        "section": "6.2.1.1",
        "page": 49,
        "url": "https://standards.nasa.gov/system/files/tmp/NASA-STD-3001%20Vol%202%20Rev%20F.pdf#page=49"
      },
      "minimum": 30,
      "minimumInclusive": true,
      "assumption": "balance-oxygen",
      "calculatorEnabled": false
    }
  ],
  "excludedSimpleRanges": [
    {
      "metric": "cabin-temperature-and-humidity",
      "sourceRequirement": "V2 6012",
      "sourceFigure": "6.2-2",
      "page": 55,
      "reason": "Coupled operating polygon; independent temperature and humidity intervals would misrepresent it.",
      "url": "https://standards.nasa.gov/system/files/tmp/NASA-STD-3001%20Vol%202%20Rev%20F.pdf#page=55"
    }
  ],
  "dataIntegrity": {
    "personalMeasurements": false,
    "liveTelemetry": false,
    "notNasaEndorsedApplication": true,
    "cannotReplaceFlightRules": true,
    "sourceVersionCheckRequiredBeforeOperationalUse": true
  }
};
