import { Attack } from './Attack';

export class Character {
  constructor(
    public id: string,
    public name: string,
    public attacks: Attack[] = [],
    public enabled: boolean = true
  ) {}

  addAttack(attack: Attack): void {
    this.attacks.push(attack);
  }

  removeAttack(attackId: string): void {
    this.attacks = this.attacks.filter(a => a.id !== attackId);
  }
}
