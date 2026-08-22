/**
 * @file percentileCalculator.ts
 * Exact discrete probability mass function (PMF) and percentile calculator for D&D 5e dice & attack damage.
 */

import {
  ParsedDamage,
  HitProbabilities,
  CritRule,
  AttackConfig,
  CharacterConfig,
  DamageDistributionPoint,
  DamageDistributionResult,
  SurvivalCdfPoint,
} from '../types';
import { parseDiceString, calculateProbabilities } from '../calculator';

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

/**
 * Formats a raw discrete PMF Map into a structured array and summary stats for charting.
 */
export function formatPmfToDistribution(rawPmf: Map<number, number>): DamageDistributionResult {
  if (!rawPmf || rawPmf.size === 0) {
    return {
      data: [
        {
          damage: 0,
          probability: 1.0,
          percent: 100,
          cumulativeChance: 1.0,
          cumulativePercent: 100,
          isP25: true,
          isMedian: true,
          isP75: true,
        },
      ],
      p25: 0,
      median: 0,
      p75: 0,
      mean: 0,
      maxDamage: 0,
      rawPmf: new Map([[0, 1.0]]),
    };
  }

  const { p25, median, p75 } = getPercentilesFromPmf(rawPmf);

  let maxDamage = 0;
  let mean = 0;
  for (const [dmg, prob] of rawPmf.entries()) {
    if (dmg > maxDamage && prob > 1e-7) maxDamage = dmg;
    mean += dmg * prob;
  }

  const keys = Array.from(rawPmf.keys()).sort((a, b) => a - b);
  const isAllInteger = keys.every((k) => Number.isInteger(k));

  const allDamagePoints: number[] = [];
  if (isAllInteger && maxDamage <= 500) {
    for (let i = 0; i <= Math.ceil(maxDamage); i++) {
      allDamagePoints.push(i);
    }
  } else {
    const set = new Set([0, ...keys]);
    allDamagePoints.push(...Array.from(set).sort((a, b) => a - b));
  }

  const data: DamageDistributionPoint[] = [];

  for (let i = 0; i < allDamagePoints.length; i++) {
    const dmg = allDamagePoints[i];
    const prob = rawPmf.get(dmg) || 0;

    let cumulative = 0;
    for (const [v, p] of rawPmf.entries()) {
      if (v >= dmg - 1e-9) {
        cumulative += p;
      }
    }

    data.push({
      damage: dmg,
      probability: Number(prob.toFixed(6)),
      percent: Number((prob * 100).toFixed(3)),
      cumulativeChance: Number(Math.min(1, Math.max(0, cumulative)).toFixed(6)),
      cumulativePercent: Number((Math.min(1, Math.max(0, cumulative)) * 100).toFixed(2)),
      isP25: dmg === p25,
      isMedian: dmg === median,
      isP75: dmg === p75,
    });
  }

  return {
    data,
    p25,
    median,
    p75,
    mean: Number(mean.toFixed(2)),
    maxDamage,
    rawPmf,
  };
}

/**
 * Convolves all enabled attacks for a single character into a complete turn damage PMF.
 */
export function getTurnDamagePmf(
  attacks: AttackConfig[] = [],
  targetAc: number = 15,
  critRule: CritRule = 'double_dice'
): DamageDistributionResult {
  const activeAttacks = (attacks || []).filter((atk) => atk && atk.enabled !== false);

  if (activeAttacks.length === 0) {
    return formatPmfToDistribution(new Map([[0, 1.0]]));
  }

  let convolvedPmf: Map<number, number> | null = null;

  for (const atk of activeAttacks) {
    try {
      const expr = parseDiceString(atk.diceString || '1d8');
      const probs = calculateProbabilities({
        targetAC: targetAc,
        attackBonus: Number(atk.attackBonus) || 0,
        critThreshold: atk.critThreshold,
        advantageMode: atk.advantageMode || 'normal',
      });
      const mult = atk.isResisted ? 0.5 : atk.isVulnerable ? 2.0 : 1.0;
      const attackCritRule = critRule || atk.critRule || 'double_dice';
      const singlePmf = buildAttackRoundPmf(expr, probs, mult, attackCritRule);

      if (!convolvedPmf) {
        convolvedPmf = singlePmf;
      } else {
        convolvedPmf = convolvePmf(convolvedPmf, singlePmf);
      }
    } catch {
      const zeroPmf = new Map([[0, 1.0]]);
      convolvedPmf = convolvedPmf ? convolvePmf(convolvedPmf, zeroPmf) : zeroPmf;
    }
  }

  return formatPmfToDistribution(convolvedPmf || new Map([[0, 1.0]]));
}

/**
 * Convolves all enabled attacks across all enabled characters into the total party turn damage PMF.
 */
export function getPartyDamagePmf(
  characters: CharacterConfig[] = [],
  targetAc: number = 15,
  critRule: CritRule = 'double_dice'
): DamageDistributionResult {
  const activeCharacters = (characters || []).filter((char) => char && char.enabled !== false);

  let convolvedPartyPmf: Map<number, number> | null = null;

  for (const char of activeCharacters) {
    const charAttacks = (char.attacks || []).filter((atk) => atk && atk.enabled !== false);
    for (const atk of charAttacks) {
      try {
        const expr = parseDiceString(atk.diceString || '1d8');
        const probs = calculateProbabilities({
          targetAC: targetAc,
          attackBonus: Number(atk.attackBonus) || 0,
          critThreshold: atk.critThreshold,
          advantageMode: atk.advantageMode || 'normal',
        });
        const mult = atk.isResisted ? 0.5 : atk.isVulnerable ? 2.0 : 1.0;
        const attackCritRule = critRule || atk.critRule || 'double_dice';
        const singlePmf = buildAttackRoundPmf(expr, probs, mult, attackCritRule);

        if (!convolvedPartyPmf) {
          convolvedPartyPmf = singlePmf;
        } else {
          convolvedPartyPmf = convolvePmf(convolvedPartyPmf, singlePmf);
        }
      } catch {
        // Fallback gracefully on invalid attack
      }
    }
  }

  return formatPmfToDistribution(convolvedPartyPmf || new Map([[0, 1.0]]));
}

/**
 * Computes the discrete Survival Cumulative Distribution Function (CDF): P(Damage >= X)
 * for both the entire party and each active individual character.
 */
export function calculateSurvivalCdf(
  characters: CharacterConfig[] = [],
  targetAc: number = 15,
  critRule: CritRule = 'double_dice'
): SurvivalCdfPoint[] {
  const activeCharacters = (characters || []).filter((char) => char && char.enabled !== false);
  const partyDistribution = getPartyDamagePmf(characters, targetAc, critRule);

  const charDistributions = activeCharacters.map((char) => ({
    char,
    dist: getTurnDamagePmf(char.attacks || [], targetAc, critRule),
  }));

  const maxDamage = Math.max(
    partyDistribution.maxDamage || 0,
    ...charDistributions.map((c) => c.dist.maxDamage || 0),
    0
  );

  const points: SurvivalCdfPoint[] = [];

  const getSurvivalChance = (rawPmf: Map<number, number>, d: number): number => {
    if (!rawPmf || rawPmf.size === 0) return d === 0 ? 100 : 0;
    let sum = 0;
    for (const [val, prob] of rawPmf.entries()) {
      if (val >= d - 1e-9) {
        sum += prob;
      }
    }
    const percent = Math.min(100, Math.max(0, sum * 100));
    return Number(percent.toFixed(2));
  };

  const limit = Math.min(maxDamage, 1000);

  for (let d = 0; d <= limit; d++) {
    const point: SurvivalCdfPoint = {
      damage: d,
      partyTotal: getSurvivalChance(partyDistribution.rawPmf, d),
    };

    for (const { char, dist } of charDistributions) {
      const chance = getSurvivalChance(dist.rawPmf, d);
      if (char.id) {
        point[char.id] = chance;
      }
      if (char.name) {
        point[char.name] = chance;
      }
      if (!char.id && !char.name) {
        point['unknown'] = chance;
      }
    }

    points.push(point);
  }

  if (points.length === 0) {
    points.push({ damage: 0, partyTotal: 100 });
  }

  return points;
}
