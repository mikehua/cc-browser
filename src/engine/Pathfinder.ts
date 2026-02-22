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

    if (!map.isTilePassable(endX, endY)) {
      // If destination is blocked, try to find nearest passable tile
      return []; 
    }

    const openList: Node[] = [];
    const closedList: Set<string> = new Set();

    openList.push({
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, endX, endY),
      f: 0
    });

    while (openList.length > 0) {
      // Get node with lowest F score
      let currentIndex = 0;
      for (let i = 0; i < openList.length; i++) {
        if (openList[i].f < openList[currentIndex].f) currentIndex = i;
      }
      const current = openList[currentIndex];

      // Found goal
      if (current.x === endX && current.y === endY) {
        const path: Vector2[] = [];
        let curr: Node | undefined = current;
        while (curr) {
          path.push({ x: curr.x * map.tileSize + map.tileSize/2, y: curr.y * map.tileSize + map.tileSize/2 });
          curr = curr.parent;
        }
        return path.reverse();
      }

      openList.splice(currentIndex, 1);
      closedList.add(`${current.x},${current.y}`);

      // Check 8 neighbors
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;

          const nx = current.x + dx;
          const ny = current.y + dy;

          if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;
          if (!map.isTilePassable(nx, ny)) continue;
          if (closedList.has(`${nx},${ny}`)) continue;

          // Diagonal cost is sqrt(2), straight is 1
          const moveCost = (dx === 0 || dy === 0) ? 1 : 1.414;
          const g = current.g + moveCost;
          const h = this.heuristic(nx, ny, endX, endY);
          const f = g + h;

          const existingNode = openList.find(n => n.x === nx && n.y === ny);
          if (existingNode && g >= existingNode.g) continue;

          if (!existingNode) {
            openList.push({ x: nx, y: ny, g, h, f, parent: current });
          } else {
            existingNode.g = g;
            existingNode.f = f;
            existingNode.parent = current;
          }
        }
      }
      
      // Safety break for very long paths
      if (closedList.size > 2000) break;
    }

    return [];
  }

  private static heuristic(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }
}
