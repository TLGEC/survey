// Generated from Residential_Pricing_V8.7.xlsx. Do not edit by hand.
// The source workbook is deliberately not shipped because it contains confidential costing notes.
export const PRICING_V87 = Object.freeze({
  authority: {
    name: 'Residential_Pricing_V8.7.xlsx',
    version: '8.7',
    sha256: '1bb09b4e6c1f76e388a809a63d5c20efefa69fe5ec376c694e2b0cdc81a8f6bc',
    compiledAt: '2026-09-30',
    vatRate: 0
  },
  panels: {
    'sunpower-max3-425': { name: 'SunPower MAX3 425W', workbookModel: 'SPR-MAX3-425/430', watts: 425, unit: 110 },
    'sunpower-p7-440': { name: 'SunPower P7 440W', workbookModel: 'SPR-P7-440/455-BLK', watts: 440, unit: 82.5 },
    'sunpower-p7-495': { name: 'SunPower P7 495W', workbookModel: 'SPR-P7-495/510/-BLK', watts: 495, unit: 84 },
    'sunpower-p6-405': { name: 'SunPower P6 405W', workbookModel: 'SPR-P6-405-BLK', watts: 405, unit: 48.6, offer: true },
    'trina-440': { name: 'Trina Vertex S+ 440W', workbookModel: 'Trina Vertex S+ 440 BLK', watts: 440, unit: 60 },
    'sunpower-m-475': { name: 'SunPower M-Class 475W', workbookModel: 'SPR-M-Class-475W BLK', watts: 475, unit: 137.75 }
  },
  framing: {
    'Pantile': { unit: 30, days: [0.5,1,1.5,2,2.5,3,3.5,4] },
    'Plain Tile': { unit: 73, days: [0.5,1,1.5,2,2.5,3,3.5,4] },
    'Trapezoidal': { unit: 22.5, days: [0.5,1,1.5,2,2.25,2.5,2.75,3] },
    'Slate': { unit: 57, days: [1,2.25,3.25,4.5,5.5,6.75,8,9] },
    'Standing Seam': { unit: 31, days: [0.5,1,1.75,2.5,3.25,4,4.5,5] },
    'Flat Roof': { unit: 80, days: [0.5,1,1.5,2,2.5,3,3.5,4] },
    'In-Roof': { unit: 135, days: [1,1.75,2.5,3.5,4.1,5.25,6.25,7] },
    'Ground Screws': { unit: 97.5, days: [1,1.5,2,3,3.75,4.5,5.25,6] },
    'Fibre Cement': { unit: 50, days: [1,1,1.5,2,2.5,3,3.5,4] },
    'Other': null
  },
  inverters: {
    SigEnergy: { 3:780,4:850,5:835,6:866,8:1287,10:1402.5,12:1520,14:1662,16:1862,18:1976,20:2081 },
    SolarEdge: { 2:395.12,3:438.97,4:513.04,5:614.24,6:781.44,8:852.72,10:1228.48,12:1562.88,14:1634.16,16:2009.92,18:2344.32,20:2456.96 },
    Powerwall3: { 2:0,3:0,4:0,5:0,6:0,8:0,10:0,12:0,14:0,16:0,18:0,20:0 }
  },
  battery: {
    sig6: { first:2360, additional:1575, capacity:5.84, sundries:758 },
    sig10: { first:2835, additional:2050, capacity:8.76, sundries:659 },
    tesla: { first:4755, additional:4075, capacity:13.5, sundries:861 },
    teslaNoGateway: { first:4075, additional:4075, capacity:13.5, sundries:565 },
    teslaExpansion: { unit:3275, capacity:13.5, sundries:365 }
  },
  constants: {
    pvInstallerDay:150, electricianDay:180, labourerDay:130, projectManagerDay:200,
    designerFixed:50, adminFixed:37.5, mileage:0.45, carriage:55,
    scaffoldFirst:500, scaffoldAdditionalFactor:0.85, customerGift:25, depositInsurance:40, paperwork:40,
    inverterSundries: { SigEnergy:420, SolarEdge:341, Powerwall3:420 },
    birdPerPanel:17.5, evCharger:900,
    defaultMarkup:0.3793, teslaBatteryMarkup:0.25, sales:0.03, marketing:0.02
  }
});
