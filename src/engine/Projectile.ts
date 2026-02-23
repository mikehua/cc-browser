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

  update(dt: number) {
    const dx = this.targetPos.x - this.pos.x;
    const dy = this.targetPos.y - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveDist = this.speed * dt * 60; // Base speed scale to 60fps

    if (dist < moveDist) {
      this.pos = { ...this.targetPos };
      this.isDead = true;
    } else {
      this.pos.x += (dx / dist) * moveDist;
      this.pos.y += (dy / dist) * moveDist;
    }
  }
}
