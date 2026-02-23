import { GameEngine } from './GameEngine';

export interface Vector2 { x: number; y: number; }

export type UnitType = 'minigunner' | 'humvee' | 'medium_tank' | 'apc' | 'nod_buggy' | 'nod_light_tank' | 'nod_rocket_infantry' | 'nod_turret';
export type Side = 'GDI' | 'NOD' | 'CIVILIAN';

export interface UnitStats {
  maxHealth: number;
  speed: number;
  range: number;
  damage: number;
  fireRate: number;
  armor: number;
  viewRange: number;
}

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  'minigunner': { maxHealth: 50, speed: 42, range: 120, damage: 8, fireRate: 0.5, armor: 0, viewRange: 150 },
  'humvee': { maxHealth: 150, speed: 140, range: 160, damage: 12, fireRate: 0.6, armor: 1, viewRange: 220 },
  'medium_tank': { maxHealth: 400, speed: 77, range: 200, damage: 40, fireRate: 1.5, armor: 2, viewRange: 180 },
  'apc': { maxHealth: 300, speed: 123, range: 140, damage: 10, fireRate: 0.4, armor: 3, viewRange: 180 },
  'nod_buggy': { maxHealth: 120, speed: 158, range: 140, damage: 10, fireRate: 0.4, armor: 1, viewRange: 200 },
  'nod_light_tank': { maxHealth: 300, speed: 98, range: 180, damage: 30, fireRate: 1.2, armor: 2, viewRange: 180 },
  'nod_rocket_infantry': { maxHealth: 45, speed: 35, range: 220, damage: 25, fireRate: 1.0, armor: 0, viewRange: 160 },
  'nod_turret': { maxHealth: 400, speed: 0, range: 250, damage: 50, fireRate: 1.6, armor: 4, viewRange: 250 },
};

export class Unit {
  id: string;
  type: UnitType;
  side: Side;
  pos: Vector2;
  targetPos?: Vector2;
  targetUnit?: Unit;
  health: number;
  angle: number;
  turretAngle: number;
  isSelected: boolean = false;
  lastFireTime: number = 0;
  path: Vector2[] = [];

  constructor(id: string, type: UnitType, side: Side, pos: Vector2) {
    this.id = id;
    this.type = type;
    this.side = side;
    this.pos = { ...pos };
    this.health = UNIT_STATS[type].maxHealth;
    this.angle = 0;
    this.turretAngle = 0;
  }

  update(units: Unit[], engine: GameEngine, dt: number) {
    const stats = UNIT_STATS[this.type];

    // Combat
    if (this.targetUnit) {
      if (this.targetUnit.health <= 0) {
        this.targetUnit = undefined;
        this.targetPos = undefined;
      } else {
        const dx = this.targetUnit.pos.x - this.pos.x;
        const dy = this.targetUnit.pos.y - this.pos.y;
        const distSq = dx * dx + dy * dy;

        if (distSq <= stats.range * stats.range) {
          this.turretAngle = Math.atan2(dy, dx);
          this.path = [];
          this.targetPos = undefined;
          
          if (performance.now() - this.lastFireTime > stats.fireRate * 1000) {
             this.fire(this.targetUnit, engine);
             this.lastFireTime = performance.now();
          }
        } else if (this.path.length === 0) {
          // Pursuit logic: only if no path exists
          this.targetPos = { ...this.targetUnit.pos };
        }
      }
    }

    // Movement (Using Delta Time)
    const moveDist = stats.speed * dt;
    if (this.path.length > 0) {
      const nextWaypoint = this.path[0];
      const dx = nextWaypoint.x - this.pos.x;
      const dy = nextWaypoint.y - this.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < moveDist + 1) {
        this.path.shift();
      } else {
        this.pos.x += (dx / dist) * moveDist;
        this.pos.y += (dy / dist) * moveDist;
        this.angle = Math.atan2(dy, dx);
      }
    } else if (this.targetPos) {
      const dx = this.targetPos.x - this.pos.x;
      const dy = this.targetPos.y - this.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < moveDist + 1) {
        this.targetPos = undefined;
      } else {
        this.pos.x += (dx / dist) * moveDist;
        this.pos.y += (dy / dist) * moveDist;
        this.angle = Math.atan2(dy, dx);
      }
    }

    // AI logic for NOD: Aggressive auto-acquisition
    if (this.side === 'NOD') {
      // If target is dead or out of detection range, find a new one
      if (this.targetUnit && this.targetUnit.health <= 0) {
        this.targetUnit = undefined;
      }

      if (!this.targetUnit) {
        let nearest: Unit | undefined;
        let minDistSq = stats.viewRange * stats.viewRange * 1.5;
        units.forEach(u => {
          if (u.side === 'GDI') {
            const dx = u.pos.x - this.pos.x;
            const dy = u.pos.y - this.pos.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < minDistSq) {
              minDistSq = d2;
              nearest = u;
            }
          }
        });
        if (nearest) this.targetUnit = nearest;
      }
    }
  }

  fire(target: Unit, engine: GameEngine) {
    const isRocket = this.type === 'nod_rocket_infantry';
    const isShell = this.type.includes('tank') || this.type === 'nod_turret';
    const projType = isRocket ? 'rocket' : (isShell ? 'shell' : 'bullet');
    engine.spawnProjectile(this.side, this.pos, target.pos, projType as any, UNIT_STATS[this.type].damage);
  }
}
