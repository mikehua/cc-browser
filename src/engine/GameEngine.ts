import { Unit, Vector2, Side, UNIT_STATS } from './Unit';
import { Projectile } from './Projectile';
import { GameMap } from './Map';
import { Pathfinder } from './Pathfinder';

export class GameEngine {
  units: Unit[] = [];
  projectiles: Projectile[] = [];
  map: GameMap;
  nextId: number = 1;
  nextProjId: number = 1;
  width: number;
  height: number;
  missionState: 'START' | 'TOWN_REACHED' | 'WIN' | 'LOSS' = 'START';

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.map = new GameMap(Math.floor(width / 32), Math.floor(height / 32), 32);

    // Initial GDI Force (South West)
    this.spawnUnit('apc', 'GDI', { x: 50, y: height - 100 });
    this.spawnUnit('humvee', 'GDI', { x: 80, y: height - 150 });
    this.spawnUnit('minigunner', 'GDI', { x: 120, y: height - 120 });
    this.spawnUnit('minigunner', 'GDI', { x: 120, y: height - 100 });

    // Nod Ambush: Bridge Guard (Center)
    const bridgeX = Math.floor(width * 0.4);
    const bridgeY = Math.floor(height * 0.5);
    this.spawnUnit('nod_turret', 'NOD', { x: bridgeX + 150, y: bridgeY - 50 });
    this.spawnUnit('nod_rocket_infantry', 'NOD', { x: bridgeX + 200, y: bridgeY - 100 });

    // Nod Ambush: North Village
    this.spawnUnit('nod_buggy', 'NOD', { x: Math.floor(width * 0.3), y: Math.floor(height * 0.25) });
    this.spawnUnit('minigunner', 'NOD', { x: Math.floor(width * 0.35), y: Math.floor(height * 0.2) });

    // Nod Defense: Main Bialystok Town (Far East)
    const townX = Math.floor(width * 0.8);
    const townY = Math.floor(height * 0.6);
    this.spawnUnit('nod_light_tank', 'NOD', { x: townX - 50, y: townY - 50 });
    this.spawnUnit('nod_turret', 'NOD', { x: townX + 100, y: townY + 100 });
    this.spawnUnit('nod_rocket_infantry', 'NOD', { x: townX, y: townY - 150 });
    this.spawnUnit('nod_buggy', 'NOD', { x: townX + 150, y: townY });

    this.updateShroud();
  }

  spawnUnit(type: any, side: Side, pos: Vector2) {
    const unit = new Unit((this.nextId++).toString(), type, side, pos);
    this.units.push(unit);
    return unit;
  }

  spawnProjectile(side: Side, pos: Vector2, target: Vector2, type: 'bullet' | 'shell' | 'rocket', damage: number) {
    const speed = type === 'rocket' ? 6 : (type === 'shell' ? 8 : 12);
    const proj = new Projectile((this.nextProjId++).toString(), side, { ...pos }, { ...target }, speed, damage, type);
    this.projectiles.push(proj);
  }

  update() {
    this.units = this.units.filter(u => u.health > 0);
    this.units.forEach(u => u.update(this.units, this));

    this.projectiles.forEach(p => {
      p.update();
      if (p.isDead) {
        const target = this.units.find(u => {
           const dx = u.pos.x - p.pos.x;
           const dy = u.pos.y - p.pos.y;
           return (dx * dx + dy * dy) < 400;
        });
        if (target && target.side !== p.side) {
           target.health -= Math.max(1, p.damage - UNIT_STATS[target.type].armor);
        }
      }
    });
    this.projectiles = this.projectiles.filter(p => !p.isDead);

    this.updateShroud();
    this.checkObjectives();
  }

  updateShroud() {
    this.units.forEach(u => {
      if (u.side === 'GDI') {
        this.map.revealShroud(u.pos.x, u.pos.y, UNIT_STATS[u.type].viewRange);
      }
    });
  }

  checkObjectives() {
    // Primary Objective: Destroy all Nod units
    const nodAlive = this.units.some(u => u.side === 'NOD');
    if (!nodAlive && this.units.some(u => u.side === 'GDI')) {
       this.missionState = 'WIN';
       return;
    }

    // Secondary Event: Reinforcements when reaching town
    if (this.missionState === 'START') {
      const townX = this.width * 0.8;
      const townY = this.height * 0.6;
      const reachTown = this.units.some(u => u.side === 'GDI' && Math.hypot(u.pos.x - townX, u.pos.y - townY) < 250);
      
      if (reachTown) {
        this.missionState = 'TOWN_REACHED';
        this.spawnUnit('medium_tank', 'GDI', { x: 50, y: 100 });
        this.spawnUnit('medium_tank', 'GDI', { x: 50, y: 150 });
        this.spawnUnit('medium_tank', 'GDI', { x: 50, y: 200 });
        this.spawnUnit('minigunner', 'GDI', { x: 50, y: 250 });
        this.spawnUnit('minigunner', 'GDI', { x: 50, y: 300 });
      }
    }

    if (!this.units.some(u => u.side === 'GDI')) {
      this.missionState = 'LOSS';
    }
  }

  selectUnitsInBox(start: Vector2, end: Vector2) {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    this.units.forEach(u => {
      if (u.side === 'GDI') {
        u.isSelected = u.pos.x >= minX && u.pos.x <= maxX && u.pos.y >= minY && u.pos.y <= maxY;
      }
    });
  }

  issueMoveCommand(pos: Vector2) {
    this.units.filter(u => u.isSelected).forEach(u => {
      const path = Pathfinder.findPath(this.map, u.pos, pos);
      if (path.length > 0) {
        u.path = path;
        u.targetPos = undefined;
        u.targetUnit = undefined;
      } else {
        // Fallback to simple move if pathfinder fails
        u.targetPos = { ...pos };
        u.path = [];
        u.targetUnit = undefined;
      }
    });
  }

  issueAttackCommand(target: Unit) {
    this.units.filter(u => u.isSelected).forEach(u => {
      u.targetUnit = target;
      u.targetPos = undefined;
      const path = Pathfinder.findPath(this.map, u.pos, target.pos);
      if (path.length > 0) {
        u.path = path;
      }
    });
  }

  getUnitAt(pos: Vector2, radius: number = 20): Unit | undefined {
    return this.units.find(u => {
      const dx = u.pos.x - pos.x;
      const dy = u.pos.y - pos.y;
      return (dx * dx + dy * dy) <= radius * radius;
    });
  }
}
