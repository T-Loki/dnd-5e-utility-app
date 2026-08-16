import { describe, it, expect } from 'vitest';
import {
  calculateAttackDpr,
  calculateCharacterDpr,
  calculateAttackProbabilities,
  DiceParser,
  calculateAttackPercentiles,
  buildAttackOnHitPmf,
  combineAttackPercentiles,
} from '../dprEngine';
import { calculateProbabilities, calculateDamage } from '../calculator';

describe('D&D 5e Engine Refactor', () => {

  describe('1. Dice Parser Unit Tests', () => {
    it('parses single dice (1d8)', () => {
      const expr = DiceParser.parse('1d8');
      expect(expr.parts.length).toBe(1);
      expect(expr.parts[0]).toEqual({ type: 'dice', count: 1, die: 8 });
    });

    it('parses multiple distinct dice with flat modifiers (2d6 + 1d4 + 5)', () => {
      const expr = DiceParser.parse('2d6 + 1d4 + 5');
      expect(expr.parts.length).toBe(3);
      expect(expr.parts).toEqual([
        { type: 'dice', count: 2, die: 6 },
        { type: 'dice', count: 1, die: 4 },
        { type: 'modifier', value: 5 }
      ]);
    });

    it('parses negative modifiers (1d8 - 2)', () => {
      const expr = DiceParser.parse('1d8 - 2');
      expect(expr.parts.length).toBe(2);
      expect(expr.parts).toEqual([
        { type: 'dice', count: 1, die: 8 },
        { type: 'modifier', value: -2 }
      ]);
    });

    it('throws error for malformed input', () => {
      expect(() => DiceParser.parse('invalid')).toThrowError('Invalid dice expression');
    });
  });

  describe('2. Probability Tests', () => {
    const options = { targetAC: 15, attackBonus: 5 };

    it('calculates normal probabilities correctly', () => {
      const prob = calculateProbabilities({ ...options, advantageMode: 'normal' });
      expect(prob.pCrit).toBeCloseTo(0.05);
      expect(prob.pRegularHit).toBeCloseTo(0.50);
      expect(prob.pHit).toBeCloseTo(0.55);
      expect(prob.pMiss).toBeCloseTo(0.45);
    });

    it('calculates advantage probabilities correctly', () => {
      const prob = calculateProbabilities({ ...options, advantageMode: 'advantage' });
      expect(prob.pHit).toBeCloseTo(0.7975);
      expect(prob.pCrit).toBeCloseTo(0.0975);
    });

    it('calculates disadvantage probabilities correctly', () => {
      const prob = calculateProbabilities({ ...options, advantageMode: 'disadvantage' });
      expect(prob.pHit).toBeCloseTo(0.3025);
      expect(prob.pCrit).toBeCloseTo(0.0025);
    });
    
    it('handles crit threshold (19)', () => {
      const prob = calculateProbabilities({ ...options, critThreshold: 19 });
      expect(prob.pCrit).toBeCloseTo(0.10);
      expect(prob.pRegularHit).toBeCloseTo(0.45);
    });

    it('handles numerical crit threshold range 1 to 20', () => {
      const prob18 = calculateProbabilities({ ...options, critThreshold: 18 });
      expect(prob18.pCrit).toBeCloseTo(0.15);

      const prob1 = calculateProbabilities({ ...options, critThreshold: 1 });
      expect(prob1.pCrit).toBeCloseTo(1.00);
      expect(prob1.pRegularHit).toBeCloseTo(0.00);
      expect(prob1.pHit).toBeCloseTo(1.00);
    });

    it('handles invalid crit inputs by falling back to 0% crit chance', () => {
      const prob0 = calculateProbabilities({ ...options, critThreshold: 0 });
      expect(prob0.pCrit).toBe(0);
      expect(prob0.pHit).toBeCloseTo(0.55);
      expect(prob0.pRegularHit).toBeCloseTo(0.55);

      const prob21 = calculateProbabilities({ ...options, critThreshold: 21 });
      expect(prob21.pCrit).toBe(0);
      expect(prob21.pHit).toBeCloseTo(0.55);

      const probNeg = calculateProbabilities({ ...options, critThreshold: -5 });
      expect(probNeg.pCrit).toBe(0);

      const probNaN = calculateProbabilities({ ...options, critThreshold: NaN });
      expect(probNaN.pCrit).toBe(0);

      const probInvalidStr = calculateProbabilities({ ...options, critThreshold: 'invalid' as any });
      expect(probInvalidStr.pCrit).toBe(0);
    });
  });

  describe('3. Damage Calculation Tests', () => {
    const expr = DiceParser.parse('1d8 + 3');
    const prob = { pRegularHit: 0.5, pCrit: 0.05, pHit: 0.55, pMiss: 0.45, targetRollNeeded: 10 };

    it('calculates base damage and conditional on-hit PMF percentiles', () => {
      const percentiles = calculateAttackPercentiles(expr, prob, 1.0, 'double_dice');
      const result = calculateDamage(expr, prob, 'double_dice', false, false, percentiles);
      expect(result.regularAvgDamage).toBe(7.5);
      expect(result.critAvgDamage).toBe(7.5 + 4.5);
      expect(result.dpr).toBeCloseTo((0.5 * 7.5) + (0.05 * 12));
      expect(result.p25).toBe(6);
      expect(result.median).toBe(8);
      expect(result.p75).toBe(10);
      expect(result.onHitP25).toBe(6);
      expect(result.onHitP75).toBe(10);
    });

    it('calculates critical damage with max_damage_bonus rule', () => {
      const exprD6 = DiceParser.parse('1d6 + 4');
      const percentiles = calculateAttackPercentiles(exprD6, prob, 1.0, 'max_damage_bonus');
      const result = calculateDamage(exprD6, prob, 'max_damage_bonus', false, false, percentiles);

      expect(result.regularAvgDamage).toBe(7.5);
      expect(result.critAvgDamage).toBe(17.5);
      expect(result.maxPotentialDamage).toBe(20);
      expect(result.dpr).toBeCloseTo((0.5 * 7.5) + (0.05 * 17.5));
      expect(result.p25).toBe(6);
      expect(result.median).toBe(8);
    });

    it('stacks resistance (halving damage and percentiles)', () => {
      const percentiles = calculateAttackPercentiles(expr, prob, 0.5, 'double_dice');
      const result = calculateDamage(expr, prob, 'double_dice', true, false, percentiles);
      
      expect(result.regularAvgDamage).toBe(7.5 / 2);
      expect(result.critAvgDamage).toBe(12 / 2);
      expect(result.p25).toBe(3);
      expect(result.median).toBe(4);
      expect(result.p75).toBe(5);
    });

    it('applies vulnerability (doubling damage and percentiles)', () => {
      const percentiles = calculateAttackPercentiles(expr, prob, 2.0, 'double_dice');
      const result = calculateDamage(expr, prob, 'double_dice', false, true, percentiles);

      expect(result.regularAvgDamage).toBe(7.5 * 2);
      expect(result.critAvgDamage).toBe(12 * 2);
      expect(result.p25).toBe(12);
      expect(result.median).toBe(16);
      expect(result.p75).toBe(20);
    });
  });

  describe('4. End-to-End DPR & Conditional On-Hit Percentile Scenarios', () => {
    it('calculates Fighter Baseline: Longsword (1d8 + 3) with +5 to hit vs AC 15', () => {
      const config = { attackBonus: 5, diceString: '1d8 + 3' };
      
      const normalResult = calculateAttackDpr(config, 15);
      expect(normalResult.dpr).toBeCloseTo(4.35);
      expect(normalResult.p25).toBe(6);
      expect(normalResult.median).toBe(8);
      expect(normalResult.p75).toBe(10);

      const advResult = calculateAttackDpr({ ...config, advantageMode: 'advantage' }, 15);
      expect(advResult.dpr).toBeCloseTo(6.42);
      expect(advResult.p25).toBe(6);
      expect(advResult.median).toBe(8);
      expect(advResult.p75).toBe(10);

      const disResult = calculateAttackDpr({ ...config, advantageMode: 'disadvantage' }, 15);
      expect(disResult.dpr).toBeCloseTo(2.28);
      expect(disResult.p25).toBe(6);
      expect(disResult.median).toBe(8);
      expect(disResult.p75).toBe(10);
    });

    it('calculates Champion Fighter: Greatsword (2d6 + 4) with 19-20 Crit vs AC 16', () => {
      const config = { attackBonus: 5, diceString: '2d6 + 4', critThreshold: 19 };
      const result = calculateAttackDpr(config, 16);
      
      expect(result.dpr).toBeCloseTo(6.2);
      expect(result.p25).toBe(10);
      expect(result.median).toBe(12);
      expect(result.p75).toBe(14);
      expect(result.maxPotentialDamage).toBe(28);
    });

    it('calculates Champion Fighter: Greatsword (2d6 + 4) with +7 vs AC 15 (65% hit rate)', () => {
      const config = { attackBonus: 7, diceString: '2d6 + 4', critThreshold: 19 };
      const result = calculateAttackDpr(config, 15);
      
      expect(result.p25).toBe(10);
      expect(result.median).toBe(12);
      expect(result.p75).toBe(14);
    });

    it('calculates Rogue Sneak Attack with Resistance: Rapier + Sneak (1d8 + 3d6 + 4) vs AC 14 with isResisted', () => {
      const config = { attackBonus: 5, diceString: '1d8 + 3d6 + 4', isResisted: true };
      const result = calculateAttackDpr(config, 14);
      
      expect(result.dpr).toBeCloseTo(6.08); // 6.075 rounded
      expect(result.p25).toBe(8.5);
      expect(result.median).toBe(9.5);
      expect(result.p75).toBe(11);
    });

    it('calculates Attack DPR with max_damage_bonus rule (1d6 + 4 vs AC 15)', () => {
      const normalRuleResult = calculateAttackDpr({ attackBonus: 5, diceString: '1d6 + 4', critRule: 'double_dice' }, 15);
      const maxBonusResult = calculateAttackDpr({ attackBonus: 5, diceString: '1d6 + 4', critRule: 'max_damage_bonus' }, 15);

      expect(normalRuleResult.dpr).toBeCloseTo(4.30);
      expect(maxBonusResult.dpr).toBeCloseTo(4.63); // 4.625 rounded
      expect(maxBonusResult.maxPotentialDamage).toBe(20);
    });
  });

  describe('5. Character & Party Combined On-Hit Percentile Aggregation', () => {
    it('calculates DPR and multi-attack composite on-hit percentiles considering crits', () => {
      const charConfig = {
        name: 'Gimli',
        attacks: [
          { attackBonus: 5, diceString: '1d8 + 3' },
          { attackBonus: 5, diceString: '1d8 + 3' }
        ]
      };
      
      const totalDpr = calculateCharacterDpr(charConfig, 15);
      expect(totalDpr).toBeCloseTo(4.35 * 2);

      const expr = DiceParser.parse('1d8 + 3');
      const probs = calculateAttackProbabilities('normal', 15, 5, 20);
      const pmf1 = buildAttackOnHitPmf(expr, probs, 1.0, 'double_dice');
      const pmf2 = buildAttackOnHitPmf(expr, probs, 1.0, 'double_dice');

      const combined = combineAttackPercentiles([pmf1, pmf2]);
      expect(combined.p25).toBe(13);
      expect(combined.median).toBe(16);
      expect(combined.p75).toBe(18);
      expect(combined.p75).toBeGreaterThan(combined.p25);
    });
  });

  describe('6. CritRule Percentile Comparison Tests', () => {
    it('accurately distinguishes double_dice vs max_damage_bonus percentiles under guaranteed crit (critThreshold: 1)', () => {
      const doubleDiceRes = calculateAttackDpr(
        { attackBonus: 5, diceString: '1d6 + 4', critThreshold: 1, critRule: 'double_dice' },
        15
      );
      expect(doubleDiceRes.p25).toBe(9);
      expect(doubleDiceRes.median).toBe(11);
      expect(doubleDiceRes.p75).toBe(13);

      const maxBonusRes = calculateAttackDpr(
        { attackBonus: 5, diceString: '1d6 + 4', critThreshold: 1, critRule: 'max_damage_bonus' },
        15
      );
      expect(maxBonusRes.p25).toBe(16);
      expect(maxBonusRes.median).toBe(17);
      expect(maxBonusRes.p75).toBe(19);

      expect(maxBonusRes.p25).toBeGreaterThan(doubleDiceRes.p25);
      expect(maxBonusRes.p75).toBeGreaterThan(doubleDiceRes.p75);
    });

    it('calculates complex multi-dice expressions with max_damage_bonus (2d6 + 1d4 + 5)', () => {
      const maxBonusRes = calculateAttackDpr(
        { attackBonus: 5, diceString: '2d6 + 1d4 + 5', critThreshold: 1, critRule: 'max_damage_bonus' },
        15
      );
      expect(maxBonusRes.maxPotentialDamage).toBe(42);
      expect(maxBonusRes.regularAvgDamage).toBe(14.5);
      expect(maxBonusRes.critAvgDamage).toBe(14.5 + 21);
      expect(maxBonusRes.p25).toBeGreaterThanOrEqual(29);
    });

    it('verifies that the full attack PMF sums to exactly 1.0 across miss, hit, and crit outcomes', () => {
      const expr = DiceParser.parse('2d6 + 4');
      const probs = calculateProbabilities({ targetAC: 15, attackBonus: 6, critThreshold: 19, advantageMode: 'advantage' });

      const pmfDouble = buildAttackOnHitPmf(expr, probs, 1.0, 'double_dice');
      let sumDouble = 0;
      for (const p of pmfDouble.values()) sumDouble += p;
      expect(sumDouble).toBeCloseTo(1.0, 6);

      const pmfMax = buildAttackOnHitPmf(expr, probs, 1.0, 'max_damage_bonus');
      let sumMax = 0;
      for (const p of pmfMax.values()) sumMax += p;
      expect(sumMax).toBeCloseTo(1.0, 6);
    });

    it('verifies non-zero on-hit 25th and 75th percentiles even when hit chance is <75%', () => {
      const expr = DiceParser.parse('1d8 + 4');
      const probs = {
        pHit: 0.65,
        pRegularHit: 0.60,
        pCrit: 0.05,
        pMiss: 0.35,
        targetRollNeeded: 8,
      };

      const percentilesDouble = calculateAttackPercentiles(expr, probs, 1.0, 'double_dice');
      expect(percentilesDouble.p25).toBeGreaterThan(0);
      expect(percentilesDouble.p75).toBeGreaterThan(percentilesDouble.p25);
      expect(percentilesDouble.p25).toBe(7);
      expect(percentilesDouble.p75).toBe(11);

      const percentilesMax = calculateAttackPercentiles(expr, probs, 1.0, 'max_damage_bonus');
      expect(percentilesMax.p25).toBeGreaterThan(0);
      expect(percentilesMax.p75).toBeGreaterThan(percentilesMax.p25);
      expect(percentilesMax.p25).toBe(7);
      expect(percentilesMax.p75).toBe(11);
    });

    it('gracefully handles edge case where total hit probability is 0%', () => {
      const expr = DiceParser.parse('1d8 + 3');
      const zeroProb = {
        pHit: 0,
        pRegularHit: 0,
        pCrit: 0,
        pMiss: 1.0,
        targetRollNeeded: 25,
      };

      const percentiles = calculateAttackPercentiles(expr, zeroProb, 1.0, 'double_dice');
      expect(percentiles.p25).toBe(0);
      expect(percentiles.median).toBe(0);
      expect(percentiles.p75).toBe(0);
    });
  });

  describe('7. Attack Toggle & Character Aggregation Tests', () => {
    it('correctly uses enabled field', () => {
      const singleAtkDpr = calculateAttackDpr({ attackBonus: 5, diceString: '1d8 + 3' }, 15).dpr;
      
      const charConfig = {
        name: 'Fighter',
        attacks: [
          { attackBonus: 5, diceString: '1d8 + 3', enabled: true },
          { attackBonus: 5, diceString: '1d8 + 3', enabled: false },
        ],
      };
      
      const charDpr = calculateCharacterDpr(charConfig, 15);
      expect(charDpr).toBeCloseTo(singleAtkDpr, 5);
    });
  });

});
