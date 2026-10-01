import { PRICING_V87 } from './pricing-data.js';

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });

export function panelOptions() { return PRICING_V87.panels; }
export function controllerOptions(phase = 'Single Phase') {
  return Object.fromEntries(Object.entries(PRICING_V87.controllers).filter(([,controller]) => controller.phase === phase));
}
export function formatMoney(value) { return Number.isFinite(value) ? money.format(value) : 'Unavailable'; }

export function priceOption(survey, overrides = {}) {
  const option = optionValues(survey, overrides);
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
  const batteryPreview = hasBattery ? batteryCost(option) : { capacity:0 };
  const baseMeta = { sizeKw, capacityKwh:batteryPreview.capacity || 0, panelName, panelModel, panelDimensions, panelPriceBaseline:manualPanel?'':panel?.priceBaseline || '', supplyPhase:survey.site.supplyPhase, framingKey, roofCovering:survey.site.roofCovering };
  if (errors.length) return unavailable(errors, baseMeta);

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
  if (errors.length) return unavailable(errors, { ...baseMeta, inverterBrand, controllerName:controller?.name || '' });

  const panelCost = hasSolar ? panel.unit * option.panelCount : 0;
  const framingCost = hasSolar ? framing.unit * option.panelCount : 0;
  const battery = hasBattery ? batteryCost(option) : { cost:0, sundries:0, capacity:0, labourUnits:0 };
  if (battery.error) return unavailable([battery.error]);

  const pvDays = hasSolar ? framing.days[Math.min(7, Math.max(0, Math.ceil(option.panelCount / 5) - 1))] : 0;
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
  const inverterSundries = hasSolar ? (PRICING_V87.constants.inverterSundries[inverterBrand] ?? 0) : 0;
  const extras = (survey.solution.extras.birdProtection && hasSolar ? PRICING_V87.constants.birdPerPanel * option.panelCount : 0)
    + (survey.solution.extras.evCharger ? PRICING_V87.constants.evCharger : 0)
    + (survey.solution.extras.cableApproved ? number(survey.solution.extras.cableCost) : 0)
    + number(survey.solution.extras.unusualCost);
  const fixed = PRICING_V87.constants.customerGift + PRICING_V87.constants.depositInsurance + PRICING_V87.constants.paperwork;
  const totalCost = panelCost + framingCost + inverter + battery.cost + labour + logistics + scaffold + inverterSundries + battery.sundries + extras + fixed;
  const batteryOnlyTesla = !hasSolar && option.batteryBrand === 'Tesla';
  const markup = batteryOnlyTesla ? PRICING_V87.constants.teslaBatteryMarkup : PRICING_V87.constants.defaultMarkup;
  const calculated = totalCost * (1 + markup + PRICING_V87.constants.sales + PRICING_V87.constants.marketing);
  const adjustment = overrides.secondary ? 0 : authorisedAdjustment(survey.solution.adjustment);
  const final = Math.round((calculated + adjustment) / 10) * 10;
  return {
    available:true, price:final, unrounded:calculated + adjustment, sizeKw, capacityKwh:battery.capacity,
    panelName:hasSolar ? panelName : '', panelModel:hasSolar ? panelModel : '', panelDimensions:hasSolar ? panelDimensions : null,
    panelPriceBaseline:hasSolar ? panel.priceBaseline : '', inverterBrand, controllerName:controller?.name || '',
    supplyPhase:survey.site.supplyPhase, framingKey, roofCovering:survey.site.roofCovering, systemType:option.systemType,
    assumptions:estimateBenefits(survey, { hasSolar, hasBattery, sizeKw, capacityKwh:battery.capacity, price:final }),
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
  if (option.systemType === 'solar-battery' && option.batteryBrand === 'Tesla') return 'Powerwall3';
  if (option.systemType === 'solar-battery' && option.batteryBrand === 'Sigenergy') return 'SigEnergy';
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
    const desired = sizeKw || Math.max(3, number(option.sigModule) * option.batteryQty / 2.5);
    const match = choices.sort((a,b)=>a[1].kw-b[1].kw).find(([,controller])=>controller.kw>=desired) || choices.at(-1);
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

function batteryCost(option) {
  if (option.batteryBrand === 'Tesla') {
    const base = option.gateway === 'yes' ? PRICING_V87.battery.tesla : PRICING_V87.battery.teslaNoGateway;
    return {
      cost: base.first + Math.max(0, option.batteryQty - 1) * base.additional + option.expansionQty * PRICING_V87.battery.teslaExpansion.unit,
      sundries: base.sundries + (option.expansionQty ? PRICING_V87.battery.teslaExpansion.sundries : 0),
      capacity: option.batteryQty * base.capacity + option.expansionQty * PRICING_V87.battery.teslaExpansion.capacity,
      labourUnits: labourUnits(option.batteryQty) + expansionLabour(option.expansionQty)
    };
  }
  if (option.batteryBrand === 'Sigenergy') {
    const base = option.sigModule === '6' ? PRICING_V87.battery.sig6 : PRICING_V87.battery.sig10;
    const gatewayReduction = option.gateway === 'no' ? 785 : 0;
    return { cost:base.first - gatewayReduction + Math.max(0,option.batteryQty-1)*base.additional, sundries:base.sundries, capacity:option.batteryQty*base.capacity, labourUnits:labourUnits(option.batteryQty) };
  }
  return { error:'Select a mapped battery brand.' };
}

function labourUnits(quantity) { return quantity < 1 ? 0 : Math.ceil(quantity / 2) + 1; }
function expansionLabour(quantity) { return quantity < 1 ? 0 : Math.max(.5, Math.ceil(quantity / 4)); }
function authorisedAdjustment(adjustment) { return adjustment.enabled && adjustment.reason && adjustment.authorisedBy ? number(adjustment.amount) : 0; }
function number(value, fallback=0) { const parsed=Number(value); return Number.isFinite(parsed)?parsed:fallback; }
function integer(value) { return Math.max(0,Math.round(number(value))); }

function estimateBenefits(survey, option) {
  const annualUse = number(survey.energy.annualKwh);
  const importRate = number(survey.energy.importRate,28)/100;
  const exportRate = number(survey.energy.exportRate,15)/100;
  const offPeakRate = number(survey.energy.offPeakRate,8)/100;
  let generation = option.hasSolar ? option.sizeKw * 850 : 0;
  let annualSaving = 0;
  if (option.hasSolar) {
    const selfUse = option.hasBattery ? .75 : .45;
    annualSaving = generation*selfUse*importRate + generation*(1-selfUse)*exportRate;
  } else if (option.hasBattery && annualUse) {
    const shifted = Math.min(option.capacityKwh*250,annualUse*.5);
    annualSaving = shifted*Math.max(0,importRate-offPeakRate)*.9;
  }
  return {
    annualGenerationKwh:Math.round(generation), annualSaving:Math.round(annualSaving),
    paybackYears:annualSaving>0?option.price/annualSaving:null,
    labels:['Generation uses an illustrative 850 kWh per installed kWp.','Solar self-use is assumed at 45%, or 75% where storage is included.','Tariff rates and usage are based on the information entered during the visit.','Figures are indicative; OpenSolar will provide the detailed design.']
  };
}

export function recommendedBatteryKwh(survey) {
  const annual = Number(survey.energy.annualKwh) || 0;
  let target = annual ? annual/365*.55 : 9;
  if (survey.discovery.futureLoads.includes('Electric vehicle')) target += 2;
  if (survey.discovery.futureLoads.includes('Heat pump')) target += 4;
  if (survey.discovery.backupNeed === 'Important') target += 3;
  return Math.round(target*10)/10;
}

export function financeIllustration(finance) {
  if (!finance.enabled) return null;
  const principal=number(finance.totalPrice), years=number(finance.termYears), annual=number(finance.annualRate);
  if (!(principal>0&&years>0&&annual>=0)) return null;
  const months=years*12, monthlyRate=annual/100/12;
  const monthly=monthlyRate===0?principal/months:principal*monthlyRate*Math.pow(1+monthlyRate,months)/(Math.pow(1+monthlyRate,months)-1);
  return { monthly, total:monthly*months };
}
