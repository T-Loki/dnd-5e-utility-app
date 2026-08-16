export type AdvantageMode = 'normal' | 'advantage' | 'disadvantage';
export type CritRule = 'double_dice' | 'max_damage_bonus';

export class Attack {
  constructor(
    public id: string,
    public name: string,
    public attackBonus: number,
    public diceString: string,
    public critThreshold: number | string = 20,
    public advantageMode: AdvantageMode = 'normal',
    public isResisted: boolean = false,
    public isVulnerable: boolean = false,
    public critRule: CritRule = 'double_dice',
    public enabled: boolean = true
  ) {}
}

