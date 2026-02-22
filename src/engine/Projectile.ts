import { Vector2, Side } from './Unit';

export class Projectile {
  pos: Vector2;
  targetPos: Vector2;
  speed: number;
  damage: number;
  side: Side;
  id: string;
  isDead: boolean = false;
  type: 'bullet' | 'shell' | 'rocket';

  constructor(id: string, side: Side, pos: Vector2, targetPos: Vector2, speed: number, damage: number, type: 'bullet' | 'shell' | 'rocket') {
    this.id = id;
    this.side = side;
    this.pos = { ...pos };
    this.targetPos = { ...targetPos };
    this.speed = speed;
    this.damage = damage;
    this.type = type;
  }

  update() {
    const dx = this.targetPos.x - this.pos.x;
    const dy = this.targetPos.y - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.speed) {
      this.pos = { ...this.targetPos };
      this.isDead = true;
    } else {
      this.pos.x += (dx / dist) * this.speed;
      this.pos.y += (dy / dist) * this.speed;
    }
  }
}
