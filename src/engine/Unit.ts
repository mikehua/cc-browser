import { GameEngine } from './GameEngine';

export interface Vector2 { x: number; y: number; }

export type UnitType = 'minigunner' | 'humvee' | 'medium_tank' | 'apc' | 'nod_buggy' | 'nod_light_tank' | 'nod_rocket_infantry' | 'nod_turret';
export type Side = 'GDI' | 'NOD' | 'CIVILIAN';

export interface UnitStats {
  maxHealth: number;
  speed: number;
  range: number;
  damage: number;
  fireRate: number; // Frames between shots
  armor: number; // 0: None, 1: Light, 2: Heavy, 3: Concrete
  viewRange: number;
}

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  'minigunner': { maxHealth: 50, speed: 1.2, range: 120, damage: 8, fireRate: 30, armor: 0, viewRange: 150 },
  'humvee': { maxHealth: 150, speed: 4.0, range: 160, damage: 12, fireRate: 40, armor: 1, viewRange: 220 },
  'medium_tank': { maxHealth: 400, speed: 2.2, range: 200, damage: 40, fireRate: 90, armor: 2, viewRange: 180 },
  'apc': { maxHealth: 300, speed: 3.5, range: 140, damage: 10, fireRate: 25, armor: 3, viewRange: 180 },
  'nod_buggy': { maxHealth: 120, speed: 4.5, range: 140, damage: 10, fireRate: 25, armor: 1, viewRange: 200 },
  'nod_light_tank': { maxHealth: 300, speed: 2.8, range: 180, damage: 30, fireRate: 75, armor: 2, viewRange: 180 },
  'nod_rocket_infantry': { maxHealth: 45, speed: 1.0, range: 220, damage: 25, fireRate: 65, armor: 0, viewRange: 160 },
  'nod_turret': { maxHealth: 400, speed: 0, range: 250, damage: 50, fireRate: 100, armor: 4, viewRange: 250 },
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

  update(units: Unit[], engine: GameEngine) {
    const stats = UNIT_STATS[this.type];

    // Combat Logic
    if (this.targetUnit) {
      if (this.targetUnit.health <= 0) {
        this.targetUnit = undefined;
      } else {
        const dx = this.targetUnit.pos.x - this.pos.x;
        const dy = this.targetUnit.pos.y - this.pos.y;
        const distSq = dx * dx + dy * dy;

        if (distSq <= stats.range * stats.range) {
          this.turretAngle = Math.atan2(dy, dx);
          this.targetPos = undefined;
          this.path = []; // Clear path if we stop to fight
          
          if (Date.now() - this.lastFireTime > stats.fireRate * 16) {
             this.fire(this.targetUnit, engine);
             this.lastFireTime = Date.now();
          }
        } else {
          // If out of range, move toward target unit (ideally use pathfinding here too, but simple move for now)
          this.targetPos = { ...this.targetUnit.pos };
        }
      }
    }

    // Movement Logic
    if (this.path.length > 0) {
      const nextWaypoint = this.path[0];
      const dx = nextWaypoint.x - this.pos.x;
      const dy = nextWaypoint.y - this.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        this.path.shift();
      } else {
        const vx = (dx / dist) * stats.speed;
        const vy = (dy / dist) * stats.speed;
        this.pos.x += vx;
        this.pos.y += vy;
        this.angle = Math.atan2(vy, vx);
      }
    } else if (this.targetPos) {
      const dx = this.targetPos.x - this.pos.x;
      const dy = this.targetPos.y - this.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 3) {
        this.targetPos = undefined;
      } else {
        const moveSpeed = stats.speed;
        const nextX = this.pos.x + (dx / dist) * moveSpeed;
        const nextY = this.pos.y + (dy / dist) * moveSpeed;
        
        if (engine.map.isPassable(nextX, nextY)) {
           this.pos.x = nextX;
           this.pos.y = nextY;
           this.angle = Math.atan2(dy, dx);
        } else {
           this.targetPos = undefined; 
        }
      }
    }

    // AI logic for NOD
    if (this.side === 'NOD' && !this.targetUnit && this.path.length === 0 && !this.targetPos) {
      let nearest: Unit | undefined;
      let minDistSq = 1000 * 1000;
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
      if (nearest && minDistSq < stats.viewRange * stats.viewRange * 1.5) {
        this.targetUnit = nearest;
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
