import { Vector2 } from './Unit';
import { GameMap } from './Map';

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent?: Node;
}

export class Pathfinder {
  static findPath(map: GameMap, startPixel: Vector2, endPixel: Vector2): Vector2[] {
    const startX = Math.floor(startPixel.x / map.tileSize);
    const startY = Math.floor(startPixel.y / map.tileSize);
    const endX = Math.floor(endPixel.x / map.tileSize);
    const endY = Math.floor(endPixel.y / map.tileSize);

    if (!map.isTilePassable(endX, endY)) return [];
    if (startX === endX && startY === endY) return [];

    const openList: Node[] = [];
    const openMap: Map<string, Node> = new Map();
    const closedSet: Set<string> = new Set();

    const startNode: Node = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, endX, endY),
      f: 0
    };
    startNode.f = startNode.h;

    openList.push(startNode);
    openMap.set(`${startX},${startY}`, startNode);

    let iterations = 0;
    while (openList.length > 0 && iterations < 1500) {
      iterations++;
      
      // Fast lowest-F finding (still O(n) but on a smaller list usually)
      let bestIdx = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[bestIdx].f) bestIdx = i;
      }
      
      const current = openList.splice(bestIdx, 1)[0];
      const key = `${current.x},${current.y}`;
      openMap.delete(key);
      closedSet.add(key);

      if (current.x === endX && current.y === endY) {
        return this.reconstructPath(current, map.tileSize);
      }

      // 8 Neighbors
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          
          const nx = current.x + dx;
          const ny = current.y + dy;
          const nKey = `${nx},${ny}`;

          if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;
          if (!map.isTilePassable(nx, ny)) continue;
          if (closedSet.has(nKey)) continue;

          const gScore = current.g + ((dx === 0 || dy === 0) ? 1 : 1.4);
          const existing = openMap.get(nKey);

          if (!existing) {
            const newNode: Node = {
              x: nx,
              y: ny,
              g: gScore,
              h: this.heuristic(nx, ny, endX, endY),
              f: 0,
              parent: current
            };
            newNode.f = newNode.g + newNode.h;
            openList.push(newNode);
            openMap.set(nKey, newNode);
          } else if (gScore < existing.g) {
            existing.g = gScore;
            existing.f = gScore + existing.h;
            existing.parent = current;
          }
        }
      }
    }

    return [];
  }

  private static reconstructPath(node: Node, tileSize: number): Vector2[] {
    const path: Vector2[] = [];
    let curr: Node | undefined = node;
    while (curr) {
      path.push({ x: curr.x * tileSize + tileSize/2, y: curr.y * tileSize + tileSize/2 });
      curr = curr.parent;
    }
    return path.reverse();
  }

  private static heuristic(x1: number, y1: number, x2: number, y2: number): number {
    // Octile distance is better for 8-way movement
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    return (dx + dy) + (1.4 - 2) * Math.min(dx, dy);
  }
}
