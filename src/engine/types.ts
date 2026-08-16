export type AdvantageMode = 'normal' | 'advantage' | 'disadvantage';
export type CritRule = 'double_dice' | 'max_damage_bonus';

export interface AttackConfig {
  id?: string;
  name?: string;
  attackBonus: number;
  diceString: string;
  critThreshold?: number | string;
  advantageMode?: AdvantageMode;
  isResisted?: boolean;
  isVulnerable?: boolean;
  critRule?: CritRule;
  enabled?: boolean;
}

export interface CharacterConfig {
  id?: string;
  name: string;
  attacks?: AttackConfig[];
  enabled?: boolean;
}

export interface HitProbabilityOptions {
  targetAC: number;
  attackBonus: number;
  critThreshold?: number | string; // defaults to 20, 1-20 valid, invalid gives 0% crit chance
  advantageMode?: AdvantageMode;
}

export interface HitProbabilities {
  pHit: number;
  pRegularHit: number;
  pCrit: number;
  pMiss: number;
  targetRollNeeded: number;
}

export interface DamageResult {
  regularAvgDamage: number;
  critAvgDamage: number;
  maxPotentialDamage: number;
  dpr: number;
  p25: number;
  median: number;
  p75: number;
  onHitP25: number;
  onHitMedian: number;
  onHitP75: number;
}

export type DamagePart = 
  | { type: 'dice'; count: number; die: number }
  | { type: 'modifier'; value: number };

export interface ParsedDamage {
  raw: string;
  parts: DamagePart[];
}
