import {
  AttackConfig,
  CharacterConfig,
  AdvantageMode,
  CritRule,
  DamageResult,
  HitProbabilityOptions
} from './types';
import { parseDiceString, calculateProbabilities, calculateDamage } from './calculator';
import { calculateAttackPercentiles } from './stats/percentileCalculator';

export function calculateAttackDpr(config: AttackConfig, targetAC: number): DamageResult {
  const attackBonus = config.attackBonus || 0;
  const diceString = config.diceString || '1d8';
  const critThreshold = config.critThreshold !== undefined ? config.critThreshold : 20;
  const advantageMode = config.advantageMode || 'normal';
  const isResisted = config.isResisted || false;
  const isVulnerable = config.isVulnerable || false;
  const critRule = config.critRule || 'double_dice';

  const expression = parseDiceString(diceString);
  const probabilities = calculateProbabilities({
    targetAC,
    attackBonus,
    critThreshold,
    advantageMode,
  });

  let mult = 1.0;
  if (isResisted) mult *= 0.5;
  if (isVulnerable) mult *= 2.0;

  const percentiles = calculateAttackPercentiles(expression, probabilities, mult, critRule);

  return calculateDamage(expression, probabilities, critRule, isResisted, isVulnerable, percentiles);
}

export function calculateCharacterDpr(
  characterConfig: CharacterConfig,
  targetAC: number,
  critRule?: CritRule
): number {
  if (characterConfig.enabled === false) return 0;
  if (!characterConfig.attacks) return 0;

  return characterConfig.attacks.reduce((totalDpr, attack) => {
    if (attack.enabled === false) return totalDpr;
    return totalDpr + calculateAttackDpr({ ...attack, critRule: critRule || attack.critRule }, targetAC).dpr;
  }, 0);
}

export function calculateAcSweep(
  characters: CharacterConfig[] = [],
  critRule: CritRule = 'double_dice',
  minAc: number = 10,
  maxAc: number = 25
) {
  const result = [];

  for (let ac = minAc; ac <= maxAc; ac++) {
    let partyTotal = 0;
    const point: { ac: number; partyTotal: number; [key: string]: number } = {
      ac,
      partyTotal: 0,
    };

    if (Array.isArray(characters)) {
      for (const char of characters) {
        if (char.enabled === false) continue;

        let charDpr = 0;
        if (Array.isArray(char.attacks)) {
          for (const atk of char.attacks) {
            if (atk.enabled === false) continue;
            try {
              const res = calculateAttackDpr({ ...atk, critRule }, ac);
              if (res && typeof res.dpr === 'number' && !isNaN(res.dpr)) {
                charDpr += res.dpr;
              }
            } catch {
              // fallback gracefully on invalid input
            }
          }
        }

        const roundedCharDpr = Number(charDpr.toFixed(2));
        if (char.id) {
          point[char.id] = roundedCharDpr;
        }
        if (char.name) {
          // If name is not yet set or to ensure char.name is available
          point[char.name] = roundedCharDpr;
        }
        if (!char.id && !char.name) {
          point['unknown'] = roundedCharDpr;
        }

        partyTotal += charDpr;
      }
    }

    point.partyTotal = Number(partyTotal.toFixed(2));
    result.push(point);
  }

  return result;
}

export function calculateAttackProbabilities(
  advantageMode: AdvantageMode,
  targetAC: number,
  attackBonus: number,
  critThreshold: number | string = 20
) {
  return calculateProbabilities({
    targetAC,
    attackBonus,
    critThreshold,
    advantageMode,
  });
}

export function calculatePartyDprShare(
  characters: CharacterConfig[] = [],
  targetAc: number = 15,
  critRule: CritRule = 'double_dice'
): PartyDprShareItem[] {
  if (!Array.isArray(characters)) return [];

  const activeCharacters = characters.filter((c) => c && c.enabled !== false);
  const charDprs: { id: string; name: string; dpr: number; attackCount: number }[] = [];
  let totalPartyDpr = 0;

  for (const char of activeCharacters) {
    const activeAttacks = (char.attacks || []).filter((a) => a && a.enabled !== false);
    let charDpr = 0;
    for (const atk of activeAttacks) {
      try {
        const res = calculateAttackDpr({ ...atk, critRule }, targetAc);
        if (res && typeof res.dpr === 'number' && !isNaN(res.dpr)) {
          charDpr += res.dpr;
        }
      } catch {
        // fallback gracefully
      }
    }
    const dpr = Number(charDpr.toFixed(2));
    totalPartyDpr += charDpr;
    charDprs.push({
      id: char.id || `char-${Math.random().toString(36).slice(2, 7)}`,
      name: char.name || 'Unnamed Hero',
      dpr,
      attackCount: activeAttacks.length,
    });
  }

  return charDprs.map((item) => {
    let share = 0;
    if (totalPartyDpr > 0) {
      share = Number(((item.dpr / totalPartyDpr) * 100).toFixed(1));
    }
    return {
      ...item,
      share,
    };
  });
}

export function calculateCharacterAttackShare(
  character: CharacterConfig,
  targetAc: number = 15,
  critRule: CritRule = 'double_dice'
): AttackDprShareItem[] {
  if (!character || character.enabled === false || !Array.isArray(character.attacks)) {
    return [];
  }

  const activeAttacks = character.attacks.filter((a) => a && a.enabled !== false);
  const atkItems: { id: string; name: string; dpr: number; diceString: string; attackBonus: number; pHit: number }[] = [];
  let totalCharDpr = 0;

  for (const atk of activeAttacks) {
    try {
      const res = calculateAttackDpr({ ...atk, critRule }, targetAc);
      const dpr = (res && typeof res.dpr === 'number' && !isNaN(res.dpr)) ? Number(res.dpr.toFixed(2)) : 0;
      const pHit = (res && typeof res.pHit === 'number' && !isNaN(res.pHit)) ? Number(res.pHit.toFixed(3)) : 0;
      totalCharDpr += dpr;
      atkItems.push({
        id: atk.id || `atk-${Math.random().toString(36).slice(2, 7)}`,
        name: atk.name || 'Unnamed Attack',
        dpr,
        diceString: atk.diceString || '',
        attackBonus: Number(atk.attackBonus) || 0,
        pHit,
      });
    } catch {
      atkItems.push({
        id: atk.id || `atk-${Math.random().toString(36).slice(2, 7)}`,
        name: atk.name || 'Unnamed Attack',
        dpr: 0,
        diceString: atk.diceString || '',
        attackBonus: Number(atk.attackBonus) || 0,
        pHit: 0,
      });
    }
  }

  return atkItems.map((item) => {
    let share = 0;
    if (totalCharDpr > 0) {
      share = Number(((item.dpr / totalCharDpr) * 100).toFixed(1));
    }
    return {
      ...item,
      share,
    };
  });
}

// Re-export for backwards compatibility
export const DiceParser = {
  parse: parseDiceString
};

export type {
  AdvantageMode,
  CritRule,
  AttackConfig,
  CharacterConfig,
  DamageResult,
  HitProbabilityOptions,
  DamageDistributionPoint,
  DamageDistributionResult,
  SurvivalCdfPoint,
  PartyDprShareItem,
  AttackDprShareItem,
};
export {
  calculateAttackPercentiles,
  buildAttackRoundPmf,
  buildAttackOnHitPmf,
  combineAttackPercentiles,
  getTurnDamagePmf,
  getPartyDamagePmf,
  formatPmfToDistribution,
  calculateSurvivalCdf,
} from './stats/percentileCalculator';
