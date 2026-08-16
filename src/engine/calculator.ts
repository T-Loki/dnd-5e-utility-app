import {
  HitProbabilityOptions,
  HitProbabilities,
  DamageResult,
  ParsedDamage,
  DamagePart,
  CritRule
} from './types';

export function parseDiceString(diceString: string): ParsedDamage {
  if (typeof diceString !== 'string') {
    throw new TypeError(`Expected diceString to be a string, got ${typeof diceString}`);
  }

  const trimmed = diceString.trim();
  const parsed: ParsedDamage = { raw: diceString, parts: [] };

  if (trimmed === '') {
    return parsed;
  }

  const tokenRegex = /([+-]?)\s*(?:(\d*)d(\d+)|(\d+))/gi;
  let match: RegExpExecArray | null;
  let matchCount = 0;
  let flatModifier = 0;

  while ((match = tokenRegex.exec(trimmed)) !== null) {
    if (match.index === tokenRegex.lastIndex) {
      tokenRegex.lastIndex++;
    }

    const [fullMatch, signStr, countStr, dieStr, flatStr] = match;
    if (!fullMatch.trim()) continue;

    const sign = signStr === '-' ? -1 : 1;
    matchCount++;

    if (dieStr !== undefined) {
      const count = countStr === '' || countStr === undefined ? 1 : parseInt(countStr, 10);
      const die = parseInt(dieStr, 10);

      if (die > 0 && count > 0) {
        parsed.parts.push({ type: 'dice', count: count * sign, die });
      }
    } else if (flatStr !== undefined) {
      const val = parseInt(flatStr, 10);
      flatModifier += val * sign;
    }
  }

  if (matchCount === 0) {
    throw new Error(`Invalid dice expression: "${diceString}"`);
  }

  if (flatModifier !== 0) {
    parsed.parts.push({ type: 'modifier', value: flatModifier });
  }

  return parsed;
}

export function calculateProbabilities(options: HitProbabilityOptions): HitProbabilities {
  const { targetAC, attackBonus: rawAttackBonus, critThreshold, advantageMode = 'normal' } = options;
  const attackBonus = Number(rawAttackBonus) || 0;
  const targetRollNeeded = targetAC - attackBonus;

  if (attackBonus > 21) {
    return {
      pHit: 1.0,
      pRegularHit: 1.0,
      pCrit: 0.0,
      pMiss: 0.0,
      targetRollNeeded,
    };
  }

  const rawCrit =
    critThreshold === undefined || critThreshold === null
      ? 20
      : (critThreshold as any) === ''
      ? NaN
      : Number(critThreshold);

  const isValidCrit = Number.isFinite(rawCrit) && rawCrit >= 1 && rawCrit <= 20;

  let critFaceCount = 0;
  let regHitFaceCount = 0;

  if (isValidCrit) {
    const critVal = Math.floor(rawCrit);
    critFaceCount = 20 - critVal + 1;
    const maxRegRoll = critVal - 1;
    const minRegRoll = Math.max(critVal === 1 ? 1 : 2, targetRollNeeded);
    regHitFaceCount = minRegRoll <= maxRegRoll ? maxRegRoll - minRegRoll + 1 : 0;
  } else {
    critFaceCount = 0;
    const minRegRoll = Math.max(2, targetRollNeeded);
    const maxRegRoll = 20;
    regHitFaceCount = minRegRoll <= maxRegRoll ? maxRegRoll - minRegRoll + 1 : 0;
  }

  const pSingleHit = (critFaceCount + regHitFaceCount) / 20;
  const pSingleCrit = critFaceCount / 20;
  const pSingleMiss = Math.max(0, 1 - pSingleHit);

  let pHit = pSingleHit;
  let pCrit = pSingleCrit;
  let pMiss = pSingleMiss;

  if (advantageMode === 'advantage') {
    pMiss = pSingleMiss * pSingleMiss;
    pHit = 1 - pMiss;
    pCrit = 1 - Math.pow(1 - pSingleCrit, 2);
  } else if (advantageMode === 'disadvantage') {
    pHit = pSingleHit * pSingleHit;
    pMiss = 1 - pHit;
    pCrit = pSingleCrit * pSingleCrit;
  }

  const pRegularHit = Math.max(0, pHit - pCrit);

  return {
    pHit: Number(pHit.toFixed(6)),
    pRegularHit: Number(pRegularHit.toFixed(6)),
    pCrit: Number(pCrit.toFixed(6)),
    pMiss: Number(pMiss.toFixed(6)),
    targetRollNeeded,
  };
}

export function calculateDamage(
  expression: ParsedDamage,
  probabilities: HitProbabilities,
  critRule: CritRule = 'double_dice',
  isResisted: boolean = false,
  isVulnerable: boolean = false,
  percentiles: any // We'll pass the percentiles calculated by percentileCalculator here
): DamageResult {
  let baseDiceAvg = 0;
  let modifierAvg = 0;
  let maxDice = 0;
  let maxMod = 0;

  for (const part of expression.parts) {
    if (part.type === 'dice') {
      baseDiceAvg += part.count * ((part.die + 1) / 2);
      maxDice += part.count * part.die;
    } else {
      modifierAvg += part.value;
      maxMod += part.value;
    }
  }

  const baseAvgDamage = baseDiceAvg + modifierAvg;
  
  let critAvgDamage = baseAvgDamage;
  let maxPotential = maxDice + maxMod;
  
  if (probabilities.pCrit > 0) {
    if (critRule === 'double_dice') {
      critAvgDamage = (baseDiceAvg * 2) + modifierAvg;
      maxPotential = (maxDice * 2) + maxMod;
    } else if (critRule === 'max_damage_bonus') {
      critAvgDamage = baseAvgDamage + maxDice + maxMod;
      maxPotential = (maxDice + maxMod) * 2;
    }
  }

  let regularAvg = Math.max(0, baseAvgDamage);
  let critAvg = Math.max(0, critAvgDamage);
  maxPotential = Math.max(0, maxPotential);

  let mult = 1.0;
  if (isResisted) mult *= 0.5;
  if (isVulnerable) mult *= 2.0;

  regularAvg = regularAvg * mult;
  critAvg = critAvg * mult;
  maxPotential = Math.floor(maxPotential * mult);

  const dpr = (regularAvg * probabilities.pRegularHit) + (critAvg * probabilities.pCrit);

  return {
    regularAvgDamage: regularAvg,
    critAvgDamage: critAvg,
    maxPotentialDamage: maxPotential,
    dpr: Number(dpr.toFixed(2)),
    p25: percentiles?.onHitP25 || 0,
    median: percentiles?.onHitMedian || 0,
    p75: percentiles?.onHitP75 || 0,
    onHitP25: percentiles?.onHitP25 || 0,
    onHitMedian: percentiles?.onHitMedian || 0,
    onHitP75: percentiles?.onHitP75 || 0
  };
}
