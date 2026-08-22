import { describe, it, expect } from 'vitest';
import {
  calculateAttackDpr,
  calculateCharacterDpr,
  calculateAcSweep,
  calculateAttackProbabilities,
  DiceParser,
  calculateAttackPercentiles,
  buildAttackOnHitPmf,
  combineAttackPercentiles,
  getTurnDamagePmf,
  getPartyDamagePmf,
  calculateSurvivalCdf,
  calculatePartyDprShare,
  calculateCharacterAttackShare,
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

    it('handles atk bonus > 21 with 100% hit and 0% crit across normal, advantage, and disadvantage', () => {
      const probAtk22Normal = calculateProbabilities({ targetAC: 20, attackBonus: 22, advantageMode: 'normal' });
      expect(probAtk22Normal.pHit).toBe(1.0);
      expect(probAtk22Normal.pRegularHit).toBe(1.0);
      expect(probAtk22Normal.pCrit).toBe(0.0);
      expect(probAtk22Normal.pMiss).toBe(0.0);

      const probAtk25Adv = calculateProbabilities({ targetAC: 25, attackBonus: 25, advantageMode: 'advantage' });
      expect(probAtk25Adv.pHit).toBe(1.0);
      expect(probAtk25Adv.pRegularHit).toBe(1.0);
      expect(probAtk25Adv.pCrit).toBe(0.0);
      expect(probAtk25Adv.pMiss).toBe(0.0);

      const probAtk30Dis = calculateProbabilities({ targetAC: 30, attackBonus: 30, advantageMode: 'disadvantage' });
      expect(probAtk30Dis.pHit).toBe(1.0);
      expect(probAtk30Dis.pRegularHit).toBe(1.0);
      expect(probAtk30Dis.pCrit).toBe(0.0);
      expect(probAtk30Dis.pMiss).toBe(0.0);

      // Boundary check: attackBonus = 21 still follows normal d20 rules with crits possible
      const probAtk21 = calculateProbabilities({ targetAC: 20, attackBonus: 21, advantageMode: 'normal' });
      expect(probAtk21.pHit).toBeCloseTo(0.95);
      expect(probAtk21.pCrit).toBeCloseTo(0.05);
      expect(probAtk21.pRegularHit).toBeCloseTo(0.90);
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

    it('calculates Attack DPR for atk bonus > 21 with guaranteed hit and no crit (1d8 + 5, +22 atk bonus)', () => {
      const result = calculateAttackDpr({ attackBonus: 22, diceString: '1d8 + 5' }, 20);
      // Avg regular damage is 4.5 + 5 = 9.5
      // Hit is 100%, crit is 0% -> DPR = 9.5 * 1.0 = 9.50
      expect(result.dpr).toBe(9.50);
      expect(result.regularAvgDamage).toBe(9.5);
      expect(result.maxPotentialDamage).toBe(13); // Max potential is single hit max 8 + 5 = 13 (no crit)
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

  describe('8. AC Sensitivity Sweep Tests (calculateAcSweep)', () => {
    const sampleCharacters = [
      {
        id: 'c1',
        name: 'Fighter',
        enabled: true,
        attacks: [
          { attackBonus: 5, diceString: '1d8 + 3', enabled: true },
          { attackBonus: 5, diceString: '1d8 + 3', enabled: false },
        ],
      },
      {
        id: 'c2',
        name: 'Wizard',
        enabled: true,
        attacks: [
          { attackBonus: 6, diceString: '1d10', enabled: true },
        ],
      },
      {
        id: 'c3',
        name: 'Disabled Ranger',
        enabled: false,
        attacks: [
          { attackBonus: 7, diceString: '1d8 + 4', enabled: true },
        ],
      },
    ];

    it('returns an array spanning exactly AC 10 through 25', () => {
      const sweep = calculateAcSweep(sampleCharacters, 'double_dice', 10, 25);
      expect(sweep.length).toBe(16);
      expect(sweep[0].ac).toBe(10);
      expect(sweep[sweep.length - 1].ac).toBe(25);
      expect(sweep.map((pt) => pt.ac)).toEqual([
        10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
      ]);
    });

    it('excludes disabled characters and disabled attacks from partyTotal and individual entries', () => {
      const sweep = calculateAcSweep(sampleCharacters, 'double_dice', 10, 25);
      const ac15 = sweep.find((pt) => pt.ac === 15);
      expect(ac15).toBeDefined();

      const singleFighterAtk = calculateAttackDpr({ attackBonus: 5, diceString: '1d8 + 3' }, 15).dpr;
      const wizardAtk = calculateAttackDpr({ attackBonus: 6, diceString: '1d10' }, 15).dpr;

      // Fighter has 1 enabled attack and 1 disabled attack
      expect(ac15!['Fighter']).toBeCloseTo(singleFighterAtk, 2);
      expect(ac15!['Wizard']).toBeCloseTo(wizardAtk, 2);
      // Disabled Ranger should not be counted
      expect(ac15!['Disabled Ranger']).toBeUndefined();
      expect(ac15!.partyTotal).toBeCloseTo(Number((singleFighterAtk + wizardAtk).toFixed(2)), 2);
    });

    it('reflects active critRule (max_damage_bonus yields higher or equal DPR)', () => {
      const sweepDouble = calculateAcSweep(sampleCharacters, 'double_dice', 10, 25);
      const sweepMax = calculateAcSweep(sampleCharacters, 'max_damage_bonus', 10, 25);

      for (let i = 0; i < sweepDouble.length; i++) {
        expect(sweepMax[i].partyTotal).toBeGreaterThanOrEqual(sweepDouble[i].partyTotal);
      }
    });

    it('handles duplicate character names safely with unique id keys', () => {
      const duplicateChars = [
        {
          id: 'char-alpha',
          name: 'Warrior',
          enabled: true,
          attacks: [{ attackBonus: 5, diceString: '1d8 + 3', enabled: true }],
        },
        {
          id: 'char-beta',
          name: 'Warrior',
          enabled: true,
          attacks: [{ attackBonus: 7, diceString: '2d6 + 4', enabled: true }],
        },
      ];

      const sweep = calculateAcSweep(duplicateChars, 'double_dice', 15, 15);
      expect(sweep.length).toBe(1);
      expect(sweep[0]['char-alpha']).toBeDefined();
      expect(sweep[0]['char-beta']).toBeDefined();
      expect(sweep[0]['char-alpha']).not.toEqual(sweep[0]['char-beta']);
      expect(sweep[0].partyTotal).toBeCloseTo(sweep[0]['char-alpha'] + sweep[0]['char-beta'], 2);
    });

    it('handles empty characters, zero attacks, or all disabled without NaN or crashing', () => {
      const emptySweep = calculateAcSweep([], 'double_dice', 10, 25);
      expect(emptySweep.length).toBe(16);
      emptySweep.forEach((pt) => {
        expect(pt.partyTotal).toBe(0);
        expect(Number.isNaN(pt.partyTotal)).toBe(false);
      });

      const allDisabledChars = [
        {
          id: 'c1',
          name: 'Fighter',
          enabled: false,
          attacks: [{ attackBonus: 5, diceString: '1d8 + 3', enabled: true }],
        },
        {
          id: 'c2',
          name: 'Mage',
          enabled: true,
          attacks: [{ attackBonus: 5, diceString: '1d8 + 3', enabled: false }],
        },
      ];

      const disabledSweep = calculateAcSweep(allDisabledChars, 'double_dice', 10, 25);
      disabledSweep.forEach((pt) => {
        expect(pt.partyTotal).toBe(0);
      });
    });
  });

  describe('9. Turn & Party Damage Distribution PMF Tests', () => {
    const sampleAttacks = [
      {
        id: 'atk-1',
        name: 'Greatsword',
        attackBonus: 5,
        diceString: '2d6 + 3',
        enabled: true,
      },
      {
        id: 'atk-2',
        name: 'Offhand Dagger',
        attackBonus: 5,
        diceString: '1d4',
        enabled: true,
      },
      {
        id: 'atk-3',
        name: 'Disabled Smite',
        attackBonus: 5,
        diceString: '2d8',
        enabled: false,
      },
    ];

    const sampleCharacters = [
      {
        id: 'c1',
        name: 'Paladin',
        enabled: true,
        attacks: sampleAttacks,
      },
      {
        id: 'c2',
        name: 'Wizard',
        enabled: true,
        attacks: [
          {
            id: 'atk-wiz',
            name: 'Fire Bolt',
            attackBonus: 6,
            diceString: '1d10',
            enabled: true,
          },
        ],
      },
      {
        id: 'c3',
        name: 'Inactive Rogue',
        enabled: false,
        attacks: [
          {
            id: 'atk-rogue',
            name: 'Sneak Attack',
            attackBonus: 7,
            diceString: '1d6 + 3d6 + 4',
            enabled: true,
          },
        ],
      },
    ];

    it('verifies that single-character convolved turn PMF sums to 1.0', () => {
      const dist = getTurnDamagePmf(sampleAttacks, 15, 'double_dice');
      expect(dist.data.length).toBeGreaterThan(0);

      const totalProb = dist.data.reduce((sum, pt) => sum + pt.probability, 0);
      expect(totalProb).toBeCloseTo(1.0, 4);

      // Check rawPmf sum directly
      let rawSum = 0;
      for (const p of dist.rawPmf.values()) rawSum += p;
      expect(rawSum).toBeCloseTo(1.0, 5);
    });

    it('verifies that party convolved turn PMF sums to 1.0', () => {
      const partyDist = getPartyDamagePmf(sampleCharacters, 15, 'double_dice');
      expect(partyDist.data.length).toBeGreaterThan(0);

      const totalProb = partyDist.data.reduce((sum, pt) => sum + pt.probability, 0);
      expect(totalProb).toBeCloseTo(1.0, 4);
    });

    it('excludes disabled attacks and disabled characters from the distribution PMF', () => {
      // Individual turn PMF with disabled atk-3 vs without atk-3
      const distWithDisabled = getTurnDamagePmf(sampleAttacks, 15, 'double_dice');
      const distOnlyEnabled = getTurnDamagePmf(
        sampleAttacks.filter((a) => a.enabled !== false),
        15,
        'double_dice'
      );

      expect(distWithDisabled.maxDamage).toEqual(distOnlyEnabled.maxDamage);
      expect(distWithDisabled.mean).toBeCloseTo(distOnlyEnabled.mean, 2);

      // Party PMF excluding inactive rogue
      const partyDist = getPartyDamagePmf(sampleCharacters, 15, 'double_dice');
      const partyOnlyActive = getPartyDamagePmf(
        sampleCharacters.filter((c) => c.enabled !== false),
        15,
        'double_dice'
      );

      expect(partyDist.mean).toBeCloseTo(partyOnlyActive.mean, 2);
      expect(partyDist.maxDamage).toEqual(partyOnlyActive.maxDamage);
    });

    it('verifies that cumulative probability is monotonic non-increasing from 1.0 to 0', () => {
      const dist = getTurnDamagePmf(sampleAttacks, 15, 'double_dice');

      expect(dist.data[0].cumulativeChance).toBeCloseTo(1.0, 4);
      for (let i = 1; i < dist.data.length; i++) {
        expect(dist.data[i].cumulativeChance).toBeLessThanOrEqual(dist.data[i - 1].cumulativeChance + 1e-9);
      }
      const last = dist.data[dist.data.length - 1];
      expect(last.cumulativeChance).toBeGreaterThanOrEqual(0);
    });

    it('verifies percentiles p25, median, p75 match the mathematical definitions from CDF', () => {
      const dist = getTurnDamagePmf(sampleAttacks, 15, 'double_dice');

      expect(dist.p25).toBeLessThanOrEqual(dist.median);
      expect(dist.median).toBeLessThanOrEqual(dist.p75);

      // At p25, cumulative probability of damage < p25 is <= 0.25 (or P(X <= p25) >= 0.25)
      let cumSum = 0;
      for (const pt of dist.data) {
        cumSum += pt.probability;
        if (pt.damage === dist.p25) {
          expect(cumSum).toBeGreaterThanOrEqual(0.25 - 1e-4);
          break;
        }
      }
    });

    it('handles edge case of no active attacks / empty party gracefully', () => {
      const emptyTurn = getTurnDamagePmf([], 15, 'double_dice');
      expect(emptyTurn.mean).toBe(0);
      expect(emptyTurn.p25).toBe(0);
      expect(emptyTurn.median).toBe(0);
      expect(emptyTurn.p75).toBe(0);
      expect(emptyTurn.data[0].damage).toBe(0);
      expect(emptyTurn.data[0].probability).toBe(1.0);

      const emptyParty = getPartyDamagePmf([], 15, 'double_dice');
      expect(emptyParty.mean).toBe(0);
      expect(emptyParty.data.length).toBeGreaterThan(0);
    });
  });

  describe('10. Cumulative Survival CDF Tests (calculateSurvivalCdf)', () => {
    const sampleParty = [
      {
        id: 'char-1',
        name: 'Fighter',
        enabled: true,
        attacks: [
          { attackBonus: 5, diceString: '2d6 + 3', enabled: true },
        ],
      },
      {
        id: 'char-2',
        name: 'Rogue',
        enabled: true,
        attacks: [
          { attackBonus: 5, diceString: '1d8 + 3', enabled: true },
        ],
      },
      {
        id: 'char-3',
        name: 'Disabled Ranger',
        enabled: false,
        attacks: [
          { attackBonus: 7, diceString: '1d10 + 4', enabled: true },
        ],
      },
    ];

    it('verifies that P(Damage >= 0) is 100% for party and all active characters', () => {
      const cdf = calculateSurvivalCdf(sampleParty, 15, 'double_dice');
      expect(cdf.length).toBeGreaterThan(0);
      expect(cdf[0].damage).toBe(0);
      expect(cdf[0].partyTotal).toBe(100);
      expect(cdf[0]['char-1']).toBe(100);
      expect(cdf[0]['char-2']).toBe(100);
      // Disabled character should not have an entry
      expect(cdf[0]['char-3']).toBeUndefined();
    });

    it('verifies that survival probability is monotonically non-increasing as damage increases', () => {
      const cdf = calculateSurvivalCdf(sampleParty, 15, 'double_dice');

      for (let i = 1; i < cdf.length; i++) {
        expect(cdf[i].partyTotal).toBeLessThanOrEqual(cdf[i - 1].partyTotal);
        expect(cdf[i]['char-1']).toBeLessThanOrEqual(cdf[i - 1]['char-1']);
        expect(cdf[i]['char-2']).toBeLessThanOrEqual(cdf[i - 1]['char-2']);
      }
    });

    it('reaches 0% beyond maximum possible damage', () => {
      const cdf = calculateSurvivalCdf(sampleParty, 15, 'double_dice');
      const lastPoint = cdf[cdf.length - 1];
      expect(lastPoint.partyTotal).toBe(0);
      expect(lastPoint['char-1']).toBe(0);
      expect(lastPoint['char-2']).toBe(0);
    });

    it('accurately reflects critRule max_damage_bonus vs double_dice', () => {
      const cdfDouble = calculateSurvivalCdf(sampleParty, 15, 'double_dice');
      const cdfMax = calculateSurvivalCdf(sampleParty, 15, 'max_damage_bonus');

      // max_damage_bonus can reach higher damage totals, so cdfMax length >= cdfDouble length
      expect(cdfMax.length).toBeGreaterThanOrEqual(cdfDouble.length);

      // At higher damage thresholds, max_damage_bonus should have >= survival chance than double_dice
      const midDamage = Math.floor(cdfDouble.length / 2);
      expect(cdfMax[midDamage].partyTotal).toBeGreaterThanOrEqual(cdfDouble[midDamage].partyTotal);
    });

    it('handles empty characters and all-disabled characters gracefully without crashing', () => {
      const emptyCdf = calculateSurvivalCdf([], 15, 'double_dice');
      expect(emptyCdf.length).toBeGreaterThan(0);
      expect(emptyCdf[0].damage).toBe(0);
      expect(emptyCdf[0].partyTotal).toBe(100);

      const allDisabledCdf = calculateSurvivalCdf(
        [{ id: 'd1', name: 'Disabled', enabled: false, attacks: [{ attackBonus: 5, diceString: '1d8', enabled: true }] }],
        15,
        'double_dice'
      );
      expect(allDisabledCdf.length).toBeGreaterThan(0);
      expect(allDisabledCdf[0].partyTotal).toBe(100);
    });
  });

  describe('11. Party & Attack DPR Share Tests (Contribution Breakdown)', () => {
    const sampleParty = [
      {
        id: 'char-1',
        name: 'Fighter',
        enabled: true,
        attacks: [
          { id: 'a1', name: 'Greatsword 1', attackBonus: 7, diceString: '2d6 + 4', enabled: true },
          { id: 'a2', name: 'Greatsword 2', attackBonus: 7, diceString: '2d6 + 4', enabled: true },
        ],
      },
      {
        id: 'char-2',
        name: 'Rogue',
        enabled: true,
        attacks: [
          { id: 'a3', name: 'Sneak Attack', attackBonus: 7, diceString: '1d8 + 3d6 + 4', enabled: true },
        ],
      },
      {
        id: 'char-3',
        name: 'Disabled Wizard',
        enabled: false,
        attacks: [
          { id: 'a4', name: 'Fireball', attackBonus: 99, diceString: '8d6', enabled: true },
        ],
      },
    ];

    it('calculates party DPR shares and ensures they sum to 100%', () => {
      const shares = calculatePartyDprShare(sampleParty, 15, 'double_dice');
      expect(shares.length).toBe(2); // char-1 and char-2 (char-3 is disabled)

      const totalShare = shares.reduce((acc, curr) => acc + curr.share, 0);
      expect(Math.abs(totalShare - 100)).toBeLessThanOrEqual(0.2); // rounding tolerance
      expect(shares[0].dpr).toBeGreaterThan(0);
      expect(shares[1].dpr).toBeGreaterThan(0);
    });

    it('calculates individual character attack shares correctly', () => {
      const fighter = sampleParty[0];
      const attackShares = calculateCharacterAttackShare(fighter, 15, 'double_dice');
      expect(attackShares.length).toBe(2);

      // Since both attacks are identical, each should have 50.0% share
      expect(attackShares[0].share).toBe(50.0);
      expect(attackShares[1].share).toBe(50.0);
      expect(attackShares[0].dpr).toBe(attackShares[1].dpr);
    });

    it('returns 100% share when only one character is enabled', () => {
      const singleParty = [sampleParty[0]];
      const shares = calculatePartyDprShare(singleParty, 15, 'double_dice');
      expect(shares.length).toBe(1);
      expect(shares[0].share).toBe(100.0);
    });

    it('handles empty characters and all-disabled gracefully without NaN', () => {
      const emptyShares = calculatePartyDprShare([], 15, 'double_dice');
      expect(emptyShares).toEqual([]);

      const disabledParty = [
        { id: 'd1', name: 'Disabled', enabled: false, attacks: [{ attackBonus: 5, diceString: '1d8', enabled: true }] },
      ];
      const disabledShares = calculatePartyDprShare(disabledParty, 15, 'double_dice');
      expect(disabledShares).toEqual([]);

      const zeroDprParty = [
        { id: 'z1', name: 'Zero Atk', enabled: true, attacks: [] },
      ];
      const zeroShares = calculatePartyDprShare(zeroDprParty, 15, 'double_dice');
      expect(zeroShares.length).toBe(1);
      expect(zeroShares[0].share).toBe(0);
      expect(zeroShares[0].dpr).toBe(0);
      expect(isNaN(zeroShares[0].share)).toBe(false);
    });
  });

});
