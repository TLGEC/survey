import { PRICING_V87 } from './pricing-data.js';

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const preciseMoney = new Intl.NumberFormat('en-GB', { style:'currency', currency:'GBP', minimumFractionDigits:2, maximumFractionDigits:2 });

export function panelOptions() { return PRICING_V87.panels; }
export function controllerOptions(phase = 'Single Phase') {
  return Object.fromEntries(Object.entries(PRICING_V87.controllers).filter(([,controller]) => controller.phase === phase));
}
export function formatMoney(value) { return Number.isFinite(value) ? (Number.isInteger(value)?money:preciseMoney).format(value) : 'Unavailable'; }

export function priceOption(survey, overrides = {}) {
  const option = optionValues(survey, overrides);
  const priceControl = resolvePriceControl(overrides.secondary ? survey.solution.secondary.priceControl : survey.solution.priceControl);
  const errors = [];
  const hasSolar = option.systemType !== 'battery-only';
  const hasBattery = option.systemType !== 'solar-only' && option.batteryBrand !== 'None';
  const manualPanel = Boolean(survey.solution.panelOverride?.enabled);
  const panel = manualPanel ? null : PRICING_V87.panels[option.panelKey];
  const framingKey = survey.site.framingKey || survey.site.mounting;
  const framing = survey.site.framingOverride?.enabled ? null : PRICING_V87.framing[framingKey];
  if (hasSolar && manualPanel) errors.push('The selected panel needs product and price confirmation.');
  if (hasSolar && !manualPanel && !panel) errors.push('The selected panel needs product and price confirmation.');
  if (hasSolar && survey.site.framingOverride?.enabled) errors.push('The roof mounting system needs price confirmation.');
  if (hasSolar && !survey.site.framingOverride?.enabled && !framing) errors.push('The roof mounting system needs price confirmation.');
  const compatibleFraming = PRICING_V87.roofMappings[survey.site.roofCovering] || [];
  if (hasSolar && !survey.site.framingOverride?.enabled && !compatibleFraming.includes(framingKey)) errors.push('The roof covering and mounting system need review.');
  if (hasSolar && option.panelCount < 1) errors.push('Enter the proposed panel count.');
  if (hasBattery && option.batteryQty < 1) errors.push('Enter the battery quantity.');
  if (survey.site.supplyPhase === 'Needs confirmation') errors.push('Confirm whether the electrical supply is single phase or three phase.');
  const panelName = manualPanel ? [survey.solution.panelOverride.manufacturer,survey.solution.panelOverride.model].filter(Boolean).join(' ') || 'Manual panel' : panel?.name || '';
  const panelModel = manualPanel ? survey.solution.panelOverride.model : panel?.model || '';
  const panelDimensions = manualPanel ? { heightMm:number(survey.solution.panelOverride.heightMm), widthMm:number(survey.solution.panelOverride.widthMm), depthMm:number(survey.solution.panelOverride.depthMm) } : panel?.dimensions || null;
  const panelWatts = manualPanel ? number(survey.solution.panelOverride.watts) : panel?.watts || 0;
  const sizeKw = hasSolar ? panelWatts * option.panelCount / 1000 : 0;
  const batteryPreview = hasBattery ? batteryCost(option, survey.site.supplyPhase) : { capacity:0 };
  const baseMeta = { sizeKw, capacityKwh:batteryPreview.capacity || 0, maxChargeKw:batteryPreview.maxChargeKw || null, panelCount:hasSolar?option.panelCount:0, batteryBrand:hasBattery?option.batteryBrand:'None', systemType:option.systemType, panelName, panelModel, panelDimensions, panelPriceBaseline:manualPanel?'':panel?.priceBaseline || '', supplyPhase:survey.site.supplyPhase, framingKey, roofCovering:survey.site.roofCovering };
  if (errors.length) return unavailableOrManual(survey, errors, baseMeta, priceControl, { hasSolar, hasBattery });

  const inverterBrand = inverterRoute(option);
  const controller = inverterBrand === 'SigEnergy' ? resolveSigController(survey.site.supplyPhase, option, sizeKw) : null;
  let inverter;
  if (inverterBrand === 'SigEnergy') {
    inverter = controller?.cost;
    if (!controller) errors.push('Choose a Sigenergy controller that matches the electrical supply.');
    else if (controller.cost == null) errors.push(`${controller.name} needs an approved price before quotation.`);
  } else if (survey.site.supplyPhase === 'Three Phase') {
    errors.push(`${inverterBrand === 'Powerwall3' ? 'Tesla Powerwall' : inverterBrand} three-phase configuration needs product and price confirmation.`);
  } else {
    inverter = hasSolar ? inverterCost(inverterBrand, sizeKw) : batteryOnlyControllerCost(option, sizeKw);
    if (inverter == null) errors.push('The selected inverter size needs product and price confirmation.');
  }
  if (errors.length) return unavailableOrManual(survey, errors, { ...baseMeta, inverterBrand, controllerName:controller?.name || '', controllerKw:controller?.kw || null }, priceControl, { hasSolar, hasBattery });

  const panelCost = hasSolar ? panel.unit * option.panelCount : 0;
  const framingCost = hasSolar ? framing.unit * option.panelCount : 0;
  const battery = hasBattery ? batteryCost(option, survey.site.supplyPhase) : { cost:0, sundries:0, capacity:0, labourUnits:0 };
  if (battery.error) return unavailableOrManual(survey, [battery.error], baseMeta, priceControl, { hasSolar, hasBattery });

  const pvDays = hasSolar ? framing.days[Math.min(7, Math.max(1, Math.ceil(option.panelCount / 5) - 1))] : 0;
  const birdDays = hasSolar && survey.solution.extras.birdProtection ? (option.panelCount < 20 ? .1 : 1) : 0;
  const solarElectricalDays = hasSolar ? 1 : 0;
  const batteryElectricalDays = battery.labourUnits * 2;
  const labour = (pvDays + birdDays) * (PRICING_V87.constants.pvInstallerDay + PRICING_V87.constants.labourerDay)
    + (solarElectricalDays + batteryElectricalDays + (survey.solution.extras.evCharger ? .5 : 0)) * PRICING_V87.constants.electricianDay
    + (hasSolar && hasBattery ? PRICING_V87.constants.projectManagerDay / 2 : PRICING_V87.constants.projectManagerDay / 4)
    + PRICING_V87.constants.designerFixed + PRICING_V87.constants.adminFixed;
  const visits = Math.ceil(pvDays + birdDays + (solarElectricalDays + batteryElectricalDays) / 2 + 1);
  const logistics = visits * number(survey.site.distanceMiles, 25) * PRICING_V87.constants.mileage * 2
    + ((sizeKw > 8 || option.batteryQty > 1) ? PRICING_V87.constants.carriage * 2 : PRICING_V87.constants.carriage);
  const lifts = survey.site.scaffold.required === 'yes' ? Math.max(0, integer(survey.site.scaffold.lifts)) : 0;
  const scaffold = lifts ? PRICING_V87.constants.scaffoldFirst + Math.max(0, lifts - 1) * PRICING_V87.constants.scaffoldFirst * PRICING_V87.constants.scaffoldAdditionalFactor : 0;
  const inverterSundries = hasSolar ? phaseCost(PRICING_V87.constants.inverterSundries[inverterBrand], survey.site.supplyPhase) : 0;
  const extras = (survey.solution.extras.birdProtection && hasSolar ? PRICING_V87.constants.birdPerPanel * option.panelCount : 0)
    + (survey.solution.extras.evCharger ? PRICING_V87.constants.evCharger : 0)
    + (survey.solution.extras.cableApproved ? number(survey.solution.extras.cableCost) : 0)
    + number(survey.solution.extras.unusualCost);
  const fixed = PRICING_V87.constants.customerGift + PRICING_V87.constants.depositInsurance + PRICING_V87.constants.paperwork;
  const totalCost = panelCost + framingCost + inverter + battery.cost + labour + logistics + scaffold + inverterSundries + battery.sundries + extras + fixed;
  const batteryOnlyTesla = !hasSolar && option.batteryBrand === 'Tesla';
  const markup = batteryOnlyTesla ? PRICING_V87.constants.teslaBatteryMarkup : PRICING_V87.constants.defaultMarkup;
  const calculated = totalCost * (1 + markup + PRICING_V87.constants.sales + PRICING_V87.constants.marketing);
  const controlled = applyPriceControl(calculated, priceControl);
  const final = controlled.price;
  return {
    available:true, price:final, calculatedPrice:Math.round(calculated / 10) * 10, unrounded:controlled.unrounded,
    priceSource:controlled.source, discountAmount:priceControl.discount, surchargeAmount:priceControl.surcharge,
    sizeKw, capacityKwh:battery.capacity, maxChargeKw:battery.maxChargeKw&&controller?.kw?Math.min(battery.maxChargeKw,controller.kw):battery.maxChargeKw || null,
    panelCount:hasSolar?option.panelCount:0, batteryBrand:hasBattery?option.batteryBrand:'None', systemType:option.systemType,
    panelName:hasSolar ? panelName : '', panelModel:hasSolar ? panelModel : '', panelDimensions:hasSolar ? panelDimensions : null,
    panelPriceBaseline:hasSolar ? panel.priceBaseline : '', inverterBrand, controllerName:controller?.name || '',
    supplyPhase:survey.site.supplyPhase, framingKey, roofCovering:survey.site.roofCovering, systemType:option.systemType,
    assumptions:estimateBenefits(survey, { hasSolar, hasBattery, sizeKw, capacityKwh:battery.capacity, maxChargeKw:battery.maxChargeKw&&controller?.kw?Math.min(battery.maxChargeKw,controller.kw):battery.maxChargeKw, price:final }),
    costBreakdown: { panelCost, framingCost, inverter, batteryCost:battery.cost, labour, logistics, scaffold, inverterSundries, batterySundries:battery.sundries, extras, fixed, totalCost },
    authority:PRICING_V87.authority
  };
}

function optionValues(survey, overrides) {
  return {
    systemType: overrides.systemType || survey.solution.systemType,
    panelKey: overrides.panelKey || survey.solution.panelKey,
    panelCount: integer(overrides.panelCount ?? survey.solution.panelCount),
    inverterBrand: overrides.inverterBrand || survey.solution.inverterBrand,
    batteryBrand: overrides.batteryBrand || survey.solution.batteryBrand,
    batteryQty: integer(overrides.batteryQty ?? survey.solution.batteryQty),
    expansionQty: integer(overrides.expansionQty ?? survey.solution.expansionQty),
    sigModule: overrides.sigModule || survey.solution.sigModule,
    sigController: overrides.sigController || survey.solution.sigController,
    gateway: overrides.gateway || survey.solution.gateway
  };
}

function inverterRoute(option) {
  if (option.systemType !== 'solar-only' && option.batteryBrand === 'Tesla') return 'Powerwall3';
  if (option.systemType !== 'solar-only' && option.batteryBrand === 'Sigenergy') return 'SigEnergy';
  return option.inverterBrand;
}

function inverterCost(brand, sizeKw) {
  const values = PRICING_V87.inverters[brand];
  if (!values) return null;
  const band = Object.keys(values).map(Number).sort((a,b)=>a-b).find(key => sizeKw <= key);
  return band == null ? null : values[band];
}

function resolveSigController(phase, option, sizeKw) {
  const choices = Object.entries(controllerOptions(phase));
  if (!choices.length) return null;
  let key = option.sigController;
  if (key !== 'auto' && PRICING_V87.controllers[key]?.phase !== phase) key = 'auto';
  if (key === 'auto') {
    const batteryRequirement = option.batteryBrand === 'Sigenergy' ? number(option.sigModule) * option.batteryQty / 2.5 : 0;
    const desired = Math.max(sizeKw, batteryRequirement, 3);
    const match = choices.sort((a,b)=>a[1].kw-b[1].kw).find(([,controller])=>controller.kw>=desired);
    return match?.[1] || null;
  }
  return PRICING_V87.controllers[key] || null;
}

function batteryOnlyControllerCost(option) {
  if (option.batteryBrand === 'Tesla') return 0;
  if (option.batteryBrand !== 'Sigenergy') return null;
  const desired = option.sigController === 'auto' ? Math.max(3, option.sigModule * option.batteryQty / 2.5) : Number(option.sigController);
  return inverterCost('SigEnergy', desired);
}

function unavailable(errors, values={}) {
  return { available:false, reviewRequired:true, errors, authority:PRICING_V87.authority, ...values };
}

function unavailableOrManual(survey, errors, values, control, option) {
  if (control.totalOverride == null) return unavailable(errors, values);
  const price = Math.round(control.totalOverride*100)/100;
  return {
    available:true, reviewRequired:true, errors, ...values, price, calculatedPrice:null,
    priceSource:'manual-total', discountAmount:0, surchargeAmount:0,
    assumptions:estimateBenefits(survey, { ...option, sizeKw:values.sizeKw || 0, capacityKwh:values.capacityKwh || 0, maxChargeKw:values.maxChargeKw&&values.controllerKw?Math.min(values.maxChargeKw,values.controllerKw):values.maxChargeKw, price }),
    authority:PRICING_V87.authority
  };
}

function batteryCost(option, phase='Single Phase') {
  if (option.batteryBrand === 'Tesla') {
    const base = option.gateway === 'yes' ? PRICING_V87.battery.tesla : PRICING_V87.battery.teslaNoGateway;
    return {
      cost: base.first + Math.max(0, option.batteryQty - 1) * base.additional + option.expansionQty * PRICING_V87.battery.teslaExpansion.unit,
      sundries: phaseCost(base.sundries, phase) + (option.expansionQty ? phaseCost(PRICING_V87.battery.teslaExpansion.sundries, phase) : 0),
      capacity: option.batteryQty * base.capacity + option.expansionQty * PRICING_V87.battery.teslaExpansion.capacity,
      maxChargeKw:option.batteryQty*base.maxChargeKw,
      labourUnits: labourUnits(option.batteryQty) + expansionLabour(option.expansionQty)
    };
  }
  if (option.batteryBrand === 'Sigenergy') {
    const base = option.sigModule === '6' ? PRICING_V87.battery.sig6 : PRICING_V87.battery.sig10;
    const gatewayReduction = option.gateway === 'no' ? 785 : 0;
    return { cost:base.first - gatewayReduction + Math.max(0,option.batteryQty-1)*base.additional, sundries:phaseCost(option.gateway==='no'?base.noGatewaySundries:base.sundries, phase), capacity:option.batteryQty*base.capacity, maxChargeKw:option.batteryQty*base.maxChargeKw, labourUnits:option.gateway==='no'?Math.max(1,Math.floor(option.batteryQty/2)):labourUnits(option.batteryQty) };
  }
  return { error:'Select a mapped battery brand.' };
}

function phaseCost(value, phase) {
  if (typeof value === 'number') return value;
  return phase === 'Three Phase' ? number(value?.three) : number(value?.single);
}

// V8.7 Battery!O31:P38: 1,2,2,3,3,4... team-days for 1,2,3,4,5,6... units.
function labourUnits(quantity) { return quantity < 1 ? 0 : Math.floor(quantity / 2) + 1; }
function expansionLabour(quantity) { return quantity < 1 ? 0 : Math.max(.5, Math.ceil(quantity / 4)); }
function number(value, fallback=0) { const parsed=Number(value); return Number.isFinite(parsed)?parsed:fallback; }
function integer(value) { return Math.max(0,Math.round(number(value))); }

function resolvePriceControl(control={}) {
  const discountValue = parseMoney(control.discount);
  const surchargeValue = parseMoney(control.surcharge);
  const overrideValue = parseMoney(control.totalOverride);
  return {
    discount:discountValue == null ? 0 : -Math.abs(discountValue),
    surcharge:surchargeValue == null ? 0 : Math.abs(surchargeValue),
    totalOverride:overrideValue != null && overrideValue >= 0 ? overrideValue : null
  };
}
function parseMoney(value) {
  const raw=String(value??'').trim();
  if (!raw || raw==='-' || raw==='.' || raw==='-.') return null;
  const parsed=Number(raw.replace(/[£,\s]/g,''));
  return Number.isFinite(parsed)?parsed:null;
}
function applyPriceControl(calculated, control) {
  if (control.totalOverride != null) return { price:Math.round(control.totalOverride*100)/100, unrounded:control.totalOverride, source:'manual-total' };
  const unrounded=Math.max(0,Math.round(calculated/10)*10+control.discount+control.surcharge);
  const source=control.discount||control.surcharge?'calculated-adjusted':'calculated';
  return { price:Math.round(unrounded*100)/100, unrounded, source };
}

export function estimateBenefits(survey, option) {
  const annualUse = number(survey.energy.annualKwh);
  const importRate = number(survey.energy.importRate,28)/100;
  const exportRate = number(survey.energy.exportRate,15)/100;
  const generation = option.hasSolar ? option.sizeKw * 850 : 0;
  const cycleDays = 300;
  const efficiency = .9;
  const usableDailyThroughput = option.hasBattery ? option.capacityKwh * .9 : 0;
  const directSolar = option.hasSolar ? Math.min(annualUse || Infinity, generation * .45) : 0;
  const initialSurplus = Math.max(0, generation - directSolar);
  const remainingAnnualDemand = annualUse ? Math.max(0, annualUse - directSolar) : Infinity;
  const batteryPower=Math.min(number(survey.energy.offPeakChargeKw),option.maxChargeKw||Infinity);
  const dischargeHours=Math.max(0,24-Math.min(24,number(survey.energy.offPeakHours)));
  const solarDeliveryLimit = Math.min(usableDailyThroughput * cycleDays, remainingAnnualDemand, batteryPower*dischargeHours*cycleDays);
  const solarInputStored = option.hasBattery && importRate > exportRate / efficiency
    ? Math.min(initialSurplus, solarDeliveryLimit / efficiency)
    : 0;
  const solarDelivered = solarInputStored * efficiency;
  const exportedSolar = Math.max(0, initialSurplus - solarInputStored);
  const directSolarSaving = directSolar * importRate;
  const exportIncome = exportedSolar * exportRate;
  const solarStorageSaving = Math.max(0, solarDelivered * importRate);
  const gridShift = option.hasBattery ? calculateBatteryShift({
    deliverableKwhPerDay:usableDailyThroughput,
    solarDeliveredKwhPerDay:solarDelivered / cycleDays,
    peakDemandKwhPerDay:Math.min(number(survey.energy.eligiblePeakKwhPerDay),Math.max(0,remainingAnnualDemand-solarDelivered)/cycleDays),
    peakRatePence:number(survey.energy.importRate),
    offPeakRatePence:hasNumber(survey.energy.offPeakRate) ? number(survey.energy.offPeakRate) : null,
    chargePowerKw:batteryPower,
    dischargePowerKw:batteryPower,
    peakHours:dischargeHours,
    offPeakHours:number(survey.energy.offPeakHours),
    roundTripEfficiency:efficiency,
    cycleDays
  }) : emptyShift();
  const annualSaving = directSolarSaving + exportIncome + solarStorageSaving + gridShift.annualSaving;
  return {
    annualGenerationKwh:Math.round(generation), annualSaving:Math.round(annualSaving),
    paybackYears:annualSaving>0?option.price/annualSaving:null,
    monthlySaving:annualSaving/12,
    breakdown:{ directSolarSaving, exportIncome, solarStorageSaving, offPeakShiftSaving:gridShift.annualSaving, offPeakDeliveredKwh:gridShift.annualDeliveredKwh },
    labels:[
      'Generation uses an illustrative 850 kWh per installed kWp.',
      'Battery calculations allow for a 10% reserve, 90% round-trip efficiency and up to 300 equivalent operating days each year.',
      hasNumber(survey.energy.offPeakRate) ? 'Off-peak savings are limited by storage, charge power, tariff window and the peak use entered.' : 'No off-peak tariff saving is included unless an off-peak rate is entered.',
      'Solar energy stored in the battery is counted before any remaining grid-charge opportunity, so the same capacity is not counted twice.',
      'Figures are indicative; OpenSolar will provide the detailed design.'
    ]
  };
}

export function calculateBatteryShift({ deliverableKwhPerDay=0, solarDeliveredKwhPerDay=0, peakDemandKwhPerDay=0, peakRatePence=0, offPeakRatePence=null, chargePowerKw=0, offPeakHours=0, dischargePowerKw=chargePowerKw, peakHours=Math.max(0,24-offPeakHours), roundTripEfficiency=.9, cycleDays=365 }={}) {
  const efficiency=Math.min(1,Math.max(0,number(roundTripEfficiency)));
  const offPeakAvailable=offPeakRatePence!==null&&offPeakRatePence!==''&&Number.isFinite(Number(offPeakRatePence));
  if (!offPeakAvailable||efficiency<=0) return emptyShift();
  const netValuePerDeliveredKwh=number(peakRatePence)/100-(number(offPeakRatePence)/100)/efficiency;
  if (netValuePerDeliveredKwh<=0) return emptyShift();
  const remainingThroughput=Math.max(0,number(deliverableKwhPerDay)-number(solarDeliveredKwhPerDay));
  const chargeWindowOutput=Math.max(0,number(chargePowerKw)*Math.min(24,number(offPeakHours))*efficiency);
  const dischargeWindowOutput=Math.max(0,number(dischargePowerKw)*Math.min(24,number(peakHours)));
  const dailyDelivered=Math.min(remainingThroughput,Math.max(0,number(peakDemandKwhPerDay)),chargeWindowOutput,dischargeWindowOutput);
  const annualDeliveredKwh=dailyDelivered*Math.min(365,Math.max(0,number(cycleDays)));
  return { dailyDeliveredKwh:dailyDelivered, annualDeliveredKwh, annualGridInputKwh:annualDeliveredKwh/efficiency, annualSaving:annualDeliveredKwh*netValuePerDeliveredKwh };
}
function emptyShift(){return { dailyDeliveredKwh:0, annualDeliveredKwh:0, annualGridInputKwh:0, annualSaving:0 };}
function hasNumber(value){return value!==''&&value!==null&&value!==undefined&&Number.isFinite(Number(value));}

export function recommendedBatteryKwh(survey) {
  const annual = Number(survey.energy.annualKwh) || 0;
  let target = annual ? annual/365*.55 : 9;
  if (survey.discovery.futureLoads.includes('Electric vehicle')) target += 2;
  if (survey.discovery.futureLoads.includes('Heat pump')) target += 4;
  if (survey.discovery.backupNeed === 'Important') target += 3;
  return Math.round(target*10)/10;
}

export function financeIllustration(finance, pricing=null) {
  if (!finance.enabled) return null;
  if (!hasNumber(finance.annualRate)) return null;
  const principal=pricing ? (pricing.available?number(pricing.price):0) : number(finance.totalPrice), years=number(finance.termYears), annual=number(finance.annualRate);
  if (!(principal>0&&years>0&&annual>=0)) return null;
  const months=years*12, monthlyRate=annual/100/12;
  const monthly=monthlyRate===0?principal/months:principal*monthlyRate*Math.pow(1+monthlyRate,months)/(Math.pow(1+monthlyRate,months)-1);
  const monthlySaving=number(pricing?.assumptions?.annualSaving)/12;
  const netMonthly=monthly-monthlySaving;
  return { principal, monthly, total:monthly*months, monthlySaving, netMonthly, savingsExceedPayment:netMonthly<0 };
}
