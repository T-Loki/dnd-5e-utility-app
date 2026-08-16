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

export function calculateCharacterDpr(characterConfig: CharacterConfig, targetAC: number): number {
  if (characterConfig.enabled === false) return 0;
  
  if (!characterConfig.attacks) return 0;

  return characterConfig.attacks.reduce((totalDpr, attack) => {
    if (attack.enabled === false) return totalDpr;
    return totalDpr + calculateAttackDpr(attack, targetAC).dpr;
  }, 0);
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

// Re-export for backwards compatibility
export const DiceParser = {
  parse: parseDiceString
};

export type { AdvantageMode, CritRule, AttackConfig, CharacterConfig, DamageResult, HitProbabilityOptions };
export {
  calculateAttackPercentiles,
  buildAttackRoundPmf,
  buildAttackOnHitPmf,
  combineAttackPercentiles,
} from './stats/percentileCalculator';
