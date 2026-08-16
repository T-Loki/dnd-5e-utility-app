/**
 * @file percentileCalculator.ts
 * Exact discrete probability mass function (PMF) and percentile calculator for D&D 5e dice & attack damage.
 */

import { ParsedDamage, HitProbabilities, CritRule } from '../types';

export interface PercentileResult {
  p25: number;
  p75: number;
  median: number;
  onHitP25: number;
  onHitP75: number;
  onHitMedian: number;
  roundP25: number;
  roundP75: number;
}

/**
 * Convolves two discrete probability mass functions.
 * Keys represent damage values, values represent probabilities.
 */
export function convolvePmf(
  pmfA: Map<number, number>,
  pmfB: Map<number, number>
): Map<number, number> {
  const result = new Map<number, number>();

  for (const [valA, probA] of pmfA.entries()) {
    for (const [valB, probB] of pmfB.entries()) {
      const sumVal = Number((valA + valB).toFixed(2));
      const combinedProb = probA * probB;
      result.set(sumVal, (result.get(sumVal) || 0) + combinedProb);
    }
  }

  return result;
}

/**
 * Generates the discrete PMF of a single die of size S (e.g. d6 -> {1: 1/6, ..., 6: 1/6}).
 */
export function getSingleDiePmf(sides: number): Map<number, number> {
  const pmf = new Map<number, number>();
  if (sides <= 0) return pmf;

  const p = 1 / sides;
  for (let i = 1; i <= sides; i++) {
    pmf.set(i, p);
  }
  return pmf;
}

function getExpressionMax(expression: ParsedDamage): number {
  return expression.parts.reduce((max, part) => {
    if (part.type === 'dice') {
      return max + (part.count * part.die);
    }
    return max + part.value;
  }, 0);
}

/**
 * Builds the exact PMF for a ParsedDamage.
 * @param isCrit - if true, rolls all dice twice or adds max regular damage.
 * @param critRule - 'double_dice' or 'max_damage_bonus'.
 */
export function getExpressionPmf(
  expression: ParsedDamage,
  isCrit: boolean = false,
  critRule: CritRule = 'double_dice'
): Map<number, number> {
  if (isCrit && critRule === 'max_damage_bonus') {
    const regPmf = getExpressionPmf(expression, false);
    const maxDamage = getExpressionMax(expression);
    const shiftedCritPmf = new Map<number, number>();
    for (const [val, prob] of regPmf.entries()) {
      const finalVal = Math.max(0, Number((val + maxDamage).toFixed(2)));
      shiftedCritPmf.set(finalVal, (shiftedCritPmf.get(finalVal) || 0) + prob);
    }
    return shiftedCritPmf;
  }

  let currentPmf = new Map<number, number>([[0, 1.0]]);
  let flatModifier = 0;

  for (const part of expression.parts) {
    if (part.type === 'dice') {
      const count = isCrit ? part.count * 2 : part.count;
      const diePmf = getSingleDiePmf(part.die);

      for (let i = 0; i < Math.abs(count); i++) {
        if (count > 0) {
          currentPmf = convolvePmf(currentPmf, diePmf);
        } else {
          const negPmf = new Map<number, number>();
          for (const [v, p] of diePmf.entries()) {
            negPmf.set(-v, p);
          }
          currentPmf = convolvePmf(currentPmf, negPmf);
        }
      }
    } else {
      flatModifier += Number(part.value) || 0;
    }
  }

  const shiftedPmf = new Map<number, number>();
  for (const [val, prob] of currentPmf.entries()) {
    const finalVal = Math.max(0, Number((val + flatModifier).toFixed(2)));
    shiftedPmf.set(finalVal, (shiftedPmf.get(finalVal) || 0) + prob);
  }

  return shiftedPmf;
}

/**
 * Computes exact 25th, 50th (median), and 75th percentiles from a PMF.
 */
export function getPercentilesFromPmf(pmf: Map<number, number>): {
  p25: number;
  median: number;
  p75: number;
} {
  if (!pmf || pmf.size === 0) {
    return { p25: 0, median: 0, p75: 0 };
  }

  const entries = Array.from(pmf.entries())
    .filter(([val]) => !isNaN(val))
    .sort((a, b) => a[0] - b[0]);

  if (entries.length === 0) {
    return { p25: 0, median: 0, p75: 0 };
  }

  let cumulative = 0;
  let p25 = entries[0][0];
  let median = entries[0][0];
  let p75 = entries[entries.length - 1][0];

  let foundP25 = false;
  let foundMedian = false;
  let foundP75 = false;

  for (const [val, prob] of entries) {
    cumulative += prob;

    if (!foundP25 && cumulative >= 0.25 - 1e-9) {
      p25 = val;
      foundP25 = true;
    }
    if (!foundMedian && cumulative >= 0.50 - 1e-9) {
      median = val;
      foundMedian = true;
    }
    if (!foundP75 && cumulative >= 0.75 - 1e-9) {
      p75 = val;
      foundP75 = true;
      break;
    }
  }

  return { p25, median, p75 };
}

/**
 * Builds the complete discrete PMF of a single attack round, including:
 * - Miss: 0 damage with probability P(Miss)
 * - Regular Hit: Base damage PMF with probability P(Regular Hit), scaled by multiplier
 * - Critical Hit: Crit damage PMF with probability P(Crit) under CritRule, scaled by multiplier
 */
export function buildAttackRoundPmf(
  expression: ParsedDamage,
  probabilities: HitProbabilities,
  multiplierOrCritRule: number | CritRule = 1.0,
  critRuleParam: CritRule = 'double_dice'
): Map<number, number> {
  let multiplier = 1.0;
  let critRule: CritRule = 'double_dice';

  if (typeof multiplierOrCritRule === 'string') {
    critRule = multiplierOrCritRule as CritRule;
    if (typeof critRuleParam === 'number') {
      multiplier = critRuleParam;
    }
  } else if (typeof multiplierOrCritRule === 'number') {
    multiplier = multiplierOrCritRule;
    critRule = critRuleParam;
  }

  const pmf = new Map<number, number>();

  const pMiss =
    probabilities.pMiss !== undefined
      ? probabilities.pMiss
      : Math.max(0, 1 - (probabilities.pRegularHit + probabilities.pCrit));

  if (pMiss > 0) {
    pmf.set(0, (pmf.get(0) || 0) + pMiss);
  }

  if (probabilities.pRegularHit > 0) {
    const regPmf = getExpressionPmf(expression, false);
    for (const [val, prob] of regPmf.entries()) {
      const scaledVal = Math.max(0, Number((val * multiplier).toFixed(2)));
      const p = prob * probabilities.pRegularHit;
      pmf.set(scaledVal, (pmf.get(scaledVal) || 0) + p);
    }
  }

  if (probabilities.pCrit > 0) {
    const critPmf = getExpressionPmf(expression, true, critRule);
    for (const [val, prob] of critPmf.entries()) {
      const scaledVal = Math.max(0, Number((val * multiplier).toFixed(2)));
      const p = prob * probabilities.pCrit;
      pmf.set(scaledVal, (pmf.get(scaledVal) || 0) + p);
    }
  }

  return pmf;
}

/**
 * Builds the conditional On-Hit PMF of an attack (conditioned on a hit occurring: P(Hit) > 0).
 */
export function buildAttackConditionalOnHitPmf(
  expression: ParsedDamage,
  probabilities: HitProbabilities,
  multiplierOrCritRule: number | CritRule = 1.0,
  critRuleParam: CritRule = 'double_dice'
): Map<number, number> {
  let multiplier = 1.0;
  let critRule: CritRule = 'double_dice';

  if (typeof multiplierOrCritRule === 'string') {
    critRule = multiplierOrCritRule as CritRule;
    if (typeof critRuleParam === 'number') {
      multiplier = critRuleParam;
    }
  } else if (typeof multiplierOrCritRule === 'number') {
    multiplier = multiplierOrCritRule;
    critRule = critRuleParam;
  }

  const pmf = new Map<number, number>();
  const totalHitProb = probabilities.pRegularHit + probabilities.pCrit;

  if (totalHitProb <= 0) {
    pmf.set(0, 1.0);
    return pmf;
  }

  const wReg = probabilities.pRegularHit / totalHitProb;
  const wCrit = probabilities.pCrit / totalHitProb;

  if (wReg > 0) {
    const regPmf = getExpressionPmf(expression, false);
    for (const [val, prob] of regPmf.entries()) {
      const scaledVal = Math.max(0, Number((val * multiplier).toFixed(2)));
      const p = prob * wReg;
      pmf.set(scaledVal, (pmf.get(scaledVal) || 0) + p);
    }
  }

  if (wCrit > 0) {
    const critPmf = getExpressionPmf(expression, true, critRule);
    for (const [val, prob] of critPmf.entries()) {
      const scaledVal = Math.max(0, Number((val * multiplier).toFixed(2)));
      const p = prob * wCrit;
      pmf.set(scaledVal, (pmf.get(scaledVal) || 0) + p);
    }
  }

  return pmf;
}

export function buildAttackOnHitPmf(
  expression: ParsedDamage,
  probabilities: HitProbabilities,
  multiplierOrCritRule: number | CritRule = 1.0,
  critRuleParam: CritRule = 'double_dice'
): Map<number, number> {
  return buildAttackConditionalOnHitPmf(
    expression,
    probabilities,
    multiplierOrCritRule,
    critRuleParam
  );
}

export function calculateAttackPercentiles(
  expression: ParsedDamage,
  probabilities: HitProbabilities,
  multiplierOrCritRule: number | CritRule = 1.0,
  critRuleParam: CritRule = 'double_dice'
): PercentileResult {
  let multiplier = 1.0;
  let critRule: CritRule = 'double_dice';

  if (typeof multiplierOrCritRule === 'string') {
    critRule = multiplierOrCritRule as CritRule;
    if (typeof critRuleParam === 'number') {
      multiplier = critRuleParam;
    }
  } else if (typeof multiplierOrCritRule === 'number') {
    multiplier = multiplierOrCritRule;
    critRule = critRuleParam;
  }

  const totalHitProb = (probabilities.pRegularHit || 0) + (probabilities.pCrit || 0);
  if (totalHitProb <= 0) {
    return {
      p25: 0,
      median: 0,
      p75: 0,
      onHitP25: 0,
      onHitMedian: 0,
      onHitP75: 0,
      roundP25: 0,
      roundP75: 0,
    };
  }

  const onHitPmf = buildAttackConditionalOnHitPmf(
    expression,
    probabilities,
    multiplier,
    critRule
  );
  const onHitPercentiles = getPercentilesFromPmf(onHitPmf);

  const roundPmf = buildAttackRoundPmf(
    expression,
    probabilities,
    multiplier,
    critRule
  );
  const roundPercentiles = getPercentilesFromPmf(roundPmf);

  return {
    p25: onHitPercentiles.p25,
    median: onHitPercentiles.median,
    p75: onHitPercentiles.p75,
    onHitP25: onHitPercentiles.p25,
    onHitMedian: onHitPercentiles.median,
    onHitP75: onHitPercentiles.p75,
    roundP25: roundPercentiles.p25,
    roundP75: roundPercentiles.p75,
  };
}

export function buildAttackNormalPmf(
  expression: ParsedDamage,
  multiplier: number = 1.0
): Map<number, number> {
  const regPmf = getExpressionPmf(expression, false);
  const normalPmf = new Map<number, number>();

  for (const [val, prob] of regPmf.entries()) {
    const scaledVal = Number((val * multiplier).toFixed(2));
    normalPmf.set(scaledVal, (normalPmf.get(scaledVal) || 0) + prob);
  }

  return normalPmf;
}

export function combineAttackPercentiles(attackPmfs: Map<number, number>[]): {
  p25: number;
  median: number;
  p75: number;
} {
  if (!attackPmfs || attackPmfs.length === 0) {
    return { p25: 0, median: 0, p75: 0 };
  }

  let totalPmf = attackPmfs[0];
  for (let i = 1; i < attackPmfs.length; i++) {
    totalPmf = convolvePmf(totalPmf, attackPmfs[i]);
  }

  return getPercentilesFromPmf(totalPmf);
}
