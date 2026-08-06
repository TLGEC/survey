(function () {
  'use strict';

  const catalog = {
    pricingAuthority: {
      name: 'Residential_Pricing_V8.6.xlsx',
      available: false,
      message: 'Residential_Pricing_V8.6.xlsx is not present in this repository. Automatic residential pricing is disabled until the approved workbook is supplied.'
    },
    panels: {
      aiko495: {
        name: 'AIKO Neostar 3S54 495W',
        model: 'AIKO-A495-MCE54Mb',
        watts: 495,
        widthMm: 1134,
        heightMm: 1762,
        weightKg: 20.6,
        default: true
      },
      aiko540: {
        name: 'AIKO 540W',
        model: 'Confirm model before quote',
        watts: 540,
        widthMm: 1134,
        heightMm: 1954,
        weightKg: 27.1
      },
      sunpowerP7_500: {
        name: 'SunPower P7 500W',
        model: 'Confirm datasheet',
        watts: 500,
        widthMm: 1134,
        heightMm: 1900
      },
      sunpowerP7_450: {
        name: 'SunPower P7 450W',
        model: 'Confirm datasheet',
        watts: 450,
        widthMm: 1134,
        heightMm: 1762
      },
      sunpowerP6_405: {
        name: 'SunPower P6 405W warehouse offer',
        model: 'Confirm datasheet',
        watts: 405,
        widthMm: 1134,
        heightMm: 1722,
        offer: true
      }
    },
    batteries: {
      sigenergy: {
        name: 'Sigenergy SigenStor',
        bat6: { name: 'BAT 6.0', nominalKwh: 6.02, usableKwh: 5.84 },
        bat10: { name: 'BAT 10.0', nominalKwh: 9.04, usableKwh: 8.76 },
        controllers: ['3 kW', '5 kW', '8 kW', '10 kW', '12 kW', '15 kW', '20 kW']
      },
      tesla: {
        name: 'Tesla Powerwall',
        powerwall3: { name: 'Powerwall 3', usableKwh: 13.5, customerPrice: 6750 },
        gateway: { name: 'Gateway', customerPrice: 1100 },
        dcExpansion: { name: 'DC Expansion', usableKwh: 13.5, customerPrice: 5300 },
        packages: {
          powerwallGateway: 7850,
          powerwallGatewayExpansion: 13150
        }
      }
    },
    roof: {
      preferredEdgeMarginMm: 400,
      installationGapMm: 30,
      borderlineMarginMm: 200
    },
    scaffold: {
      perLift: 975,
      oneLiftMaxWidthM: 6,
      twoLiftMaxWidthM: 12
    },
    formalQuoteParagraph: 'To move forward, I\u2019ll prepare a formal quote for review and e-signing. That will let us begin the DNO application. A 20% deposit would then be placed in a secure, FCA-regulated Home Improvement Protection account, fully insurance backed. Once we receive DNO approval, we\u2019ll offer installation dates. At that point, we\u2019d request 60%, again securely held. The final 20% would be due after installation and commissioning.'
  };

  window.LGV3Catalog = Object.freeze(catalog);
})();
