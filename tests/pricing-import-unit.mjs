import assert from 'node:assert/strict';
import { parseMondayText } from '../src/import.js';
import { calculateBatteryShift, financeIllustration, priceOption } from '../src/pricing.js';
import { createSurvey, normaliseSurvey } from '../src/schema.js';

const vertical = `Here is the information from Monday:\n\n\`\`\`csv\nField,Value\nName,Wrong Generic Name\nContact Name,Michael Sample\nLead Status,Survey Booked\nLead Type,Solar PV & Battery\nContact Number,07123 456789\nEmail,michael@example.com\nSite Address,"1 High Street,\nMaidstone"\nSite Post Code,ME1 1AA\nAnnual kWh,5200\nOff-peak rate,7\n\`\`\``;
const parsedVertical = parseMondayText(vertical);
assert.equal(parsedVertical.orientation, 'vertical');
assert.equal(parsedVertical.records.length, 1, 'vertical Field,Value becomes one appointment');
assert.equal(parsedVertical.records[0].customer.firstName, 'Michael');
assert.equal(parsedVertical.records[0].customer.lastName, 'Sample');
assert.equal(parsedVertical.records[0].customer.phone, '07123 456789');
assert.equal(parsedVertical.records[0].customer.address, '1 High Street,\nMaidstone, ME1 1AA');
assert.equal(parsedVertical.records[0].customer.crmStatus, 'Survey Booked');
assert.equal(parsedVertical.records[0].energy.annualKwh, 5200);
assert.equal(parsedVertical.records[0].energy.offPeakRate, 7);
assert.equal(parsedVertical.records[0].energy.importRate, undefined, 'an off-peak rate cannot be mistaken for the peak import rate');

const repeatedVertical = `Field,Value\nName,Alex One\nEmail,alex1@example.com\nAddress,"1 Road, Kent"\nField,Value\nName,Blair Two\nEmail,blair2@example.com\nAddress,"2 Road, Kent"`;
assert.equal(parseMondayText(repeatedVertical).records.length, 2, 'repeated vertical blocks remain separate appointments');

const multiline = `\uFEFFName,Email,Address,Annual kWh\n"Taylor Green",taylor@example.com,"Flat 2,\n10 Orchard Way",4800`;
const multilineRecord = parseMondayText(multiline).records[0];
assert.equal(multilineRecord.customer.address, 'Flat 2,\n10 Orchard Way');

const duplicateHorizontal = `Name,Email,Address\nTaylor Green,taylor@example.com,10 Orchard Way\nTaylor Green,taylor@example.com,10 Orchard Way`;
const duplicateResult = parseMondayText(duplicateHorizontal);
assert.equal(duplicateResult.records.length, 1);
assert.match(duplicateResult.warnings.join(' '), /duplicate appointment/i);
assert.throws(() => parseMondayText('Field,Value\nLead Status,Booked\nLead Type,Solar'), /No appointment was found/);
assert.throws(() => parseMondayText('Name,Address\nTaylor,"10 Broken Road'), /unclosed quoted value/i);
assert.throws(() => parseMondayText('Foo,Bar\nAlpha,Beta'), /headings were not recognised/i);

const near = (actual, expected, tolerance=.001) => assert.ok(Math.abs(actual-expected)<=tolerance, `${actual} should be within ${tolerance} of ${expected}`);
const shiftBase = { deliverableKwhPerDay:10, peakRatePence:30, offPeakRatePence:7, roundTripEfficiency:.9, cycleDays:365 };
near(calculateBatteryShift({ ...shiftBase, peakDemandKwhPerDay:12, chargePowerKw:10, offPeakHours:2 }).annualSaving, 811.111111);
near(calculateBatteryShift({ ...shiftBase, peakDemandKwhPerDay:12, chargePowerKw:2, offPeakHours:2 }).annualSaving, 292);
near(calculateBatteryShift({ ...shiftBase, peakDemandKwhPerDay:2, chargePowerKw:10, offPeakHours:2 }).annualSaving, 162.222222);
near(calculateBatteryShift({ ...shiftBase, offPeakRatePence:28, peakDemandKwhPerDay:12, chargePowerKw:10, offPeakHours:2 }).annualSaving, 0);
near(calculateBatteryShift({ ...shiftBase, solarDeliveredKwhPerDay:6, peakDemandKwhPerDay:12, chargePowerKw:10, offPeakHours:2 }).annualSaving, 324.444444);
near(calculateBatteryShift({ ...shiftBase, offPeakRatePence:null, peakDemandKwhPerDay:12, chargePowerKw:10, offPeakHours:2 }).annualSaving, 0);

const tenYear = financeIllustration({ enabled:true, totalPrice:10000, annualRate:4, termYears:10 }, { available:true, price:10000, assumptions:{ annualSaving:811.111111 } });
near(tenYear.monthly, 101.245135);
near(tenYear.monthlySaving, 67.592593);
near(tenYear.netMonthly, 33.652542);
const twentyYear = financeIllustration({ enabled:true, totalPrice:10000, annualRate:4, termYears:20 }, { available:true, price:10000, assumptions:{ annualSaving:811.111111 } });
near(twentyYear.monthly, 60.598022);
near(twentyYear.netMonthly, -6.994571);
assert.equal(twentyYear.savingsExceedPayment, true);

const survey = createSurvey();
survey.solution.panelCount = 10;
survey.site.panelCount = 10;
survey.solution.batteryQty = 1;
survey.solution.sigModule = '10';
survey.site.scaffold.required = 'no';
const calculated = priceOption(survey);
assert.equal(calculated.available, true);
assert.equal(calculated.capacityKwh, 8.76, 'manufacturer usable capacity is separate from the V8.7 pricing label');
assert.equal(calculated.maxChargeKw, 4.6, 'manufacturer charge-power limit is retained');
assert.equal(calculated.costBreakdown.labour, 1007.5, 'single battery uses the V8.7 one-team-day labour band');
assert.equal(calculated.panelPriceBaseline, 'SPR-P7-495/510/-BLK');
assert.equal(calculated.price, 9760, '10 panels plus one Sigenergy 10 matches the traced V8.7 single-phase build');

const twoBatterySurvey = structuredClone(survey);
twoBatterySurvey.solution.batteryQty = 2;
const twoBattery = priceOption(twoBatterySurvey);
assert.equal(twoBattery.price, 13960);
assert.match(twoBattery.controllerName, /8 kW/, 'controller sizing uses the greater of solar and battery demand');

const solarOnlySurvey = structuredClone(survey);
Object.assign(solarOnlySurvey.solution,{systemType:'solar-only',batteryBrand:'None',batteryQty:0,inverterBrand:'SolarEdge'});
assert.equal(priceOption(solarOnlySurvey).price,4050,'single-phase SolarEdge sundries match V8.7');
const batteryOnlySurvey = structuredClone(survey);
Object.assign(batteryOnlySurvey.solution,{systemType:'battery-only',panelCount:0,batteryBrand:'Sigenergy',batteryQty:1,inverterBrand:'SigEnergy'});
assert.equal(priceOption(batteryOnlySurvey).price,6920,'single-phase Sigenergy battery-only build matches V8.7');
const teslaOnlySurvey = structuredClone(survey);
Object.assign(teslaOnlySurvey.solution,{systemType:'battery-only',panelCount:0,batteryBrand:'Tesla',batteryQty:1,inverterBrand:'Powerwall3'});
assert.equal(priceOption(teslaOnlySurvey).price,7660,'single-phase Tesla sundries match V8.7');

const constrained=structuredClone(batteryOnlySurvey);
Object.assign(constrained.energy,{annualKwh:365,importRate:30,offPeakRate:7,eligiblePeakKwhPerDay:30,offPeakHours:4,offPeakChargeKw:50});
assert.ok(priceOption(constrained).assumptions.breakdown.offPeakDeliveredKwh<=365, 'grid shifting never exceeds annual household demand');
constrained.energy.annualKwh=10000;constrained.energy.offPeakHours=.5;
assert.ok(priceOption(constrained).assumptions.breakdown.offPeakDeliveredKwh<=4*.5*.9*300+.001, 'battery-only controller bottleneck caps manufacturer charge power');

const compared=structuredClone(survey);
compared.solution.secondary.priceControl.totalOverride='14555';
assert.equal(priceOption(compared,{secondary:true,batteryQty:2}).price,14555,'comparison has an independent manual total');
assert.equal(priceOption(compared).price,9760,'comparison manual total cannot alter the primary option');
compared.solution.secondary.priceControl={discount:'-200',surcharge:'',totalOverride:''};
assert.equal(priceOption(compared,{secondary:true,batteryQty:2}).price,13760,'comparison discount is applied to its own calculation');

survey.solution.priceControl.discount = '-500';
let controlled = priceOption(survey);
assert.equal(controlled.priceSource, 'calculated-adjusted');
assert.equal(controlled.discountAmount, -500);
assert.ok(controlled.price < controlled.calculatedPrice);
survey.solution.priceControl.discount='-125.50';
assert.equal(priceOption(survey).price,calculated.price-125.50,'a decimal discount changes the final price by exactly that amount');
survey.solution.priceControl.discount = '500';
controlled = priceOption(survey);
assert.equal(controlled.discountAmount, -500, 'a pasted positive discount cannot increase the price');
survey.solution.priceControl.surcharge = '250';
survey.solution.priceControl.totalOverride = '12345';
controlled = priceOption(survey);
assert.equal(controlled.price, 12345);
assert.equal(controlled.priceSource, 'manual-total');
survey.solution.priceControl.totalOverride='12345.67';
assert.equal(priceOption(survey).price,12345.67,'a decimal final total is preserved exactly');

survey.site.supplyPhase = 'Three Phase';
controlled = priceOption(survey);
assert.equal(controlled.available, true, 'manual overall total remains usable when automatic product pricing needs review');
assert.equal(controlled.reviewRequired, true);
assert.match(controlled.errors.join(' '), /approved price/i);

const migrated = normaliseSurvey({ ...createSurvey(), solution:{ ...createSurvey().solution, priceControl:undefined, adjustment:{ enabled:true, amount:-300, reason:'legacy', authorisedBy:'legacy' } } });
assert.equal(migrated.solution.priceControl.discount, '-300', 'legacy authorised adjustment remains effective after migration');

console.log(JSON.stringify({ ok:true, imports:{ vertical:parsedVertical.records.length, repeated:2 }, pricing:{ calculated:calculated.price, labour:calculated.costBreakdown.labour }, finance:{ tenYear:tenYear.monthly, twentyYear:twentyYear.monthly } }, null, 2));
