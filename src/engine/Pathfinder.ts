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

class MinHeap {
  heap: Node[] = [];
  push(node: Node) {
    this.heap.push(node);
    this.bubbleUp();
  }
  pop(): Node | undefined {
    if (this.size() === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.size() > 0) {
      this.heap[0] = last;
      this.sinkDown();
    }
    return top;
  }
  size() { return this.heap.length; }
  private bubbleUp() {
    let index = this.heap.length - 1;
    while (index > 0) {
      let parentIdx = Math.floor((index - 1) / 2);
      if (this.heap[index].f >= this.heap[parentIdx].f) break;
      [this.heap[index], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[index]];
      index = parentIdx;
    }
  }
  private sinkDown() {
    let index = 0;
    while (true) {
      let left = 2 * index + 1;
      let right = 2 * index + 2;
      let swap = -1;
      if (left < this.heap.length) {
        if (this.heap[left].f < this.heap[index].f) swap = left;
      }
      if (right < this.heap.length) {
        if ((swap === -1 && this.heap[right].f < this.heap[index].f) ||
            (swap !== -1 && this.heap[right].f < this.heap[left].f)) swap = right;
      }
      if (swap === -1) break;
      [this.heap[index], this.heap[swap]] = [this.heap[swap], this.heap[index]];
      index = swap;
    }
  }
}

export class Pathfinder {
  static findPath(map: GameMap, startPixel: Vector2, endPixel: Vector2): Vector2[] {
    const startX = Math.floor(startPixel.x / map.tileSize);
    const startY = Math.floor(startPixel.y / map.tileSize);
    const endX = Math.floor(endPixel.x / map.tileSize);
    const endY = Math.floor(endPixel.y / map.tileSize);

    if (!map.isTilePassable(endX, endY)) return [];
    if (startX === endX && startY === endY) return [];

    const openList = new MinHeap();
    const openMap = new Map<string, number>(); // key -> gScore
    const closedSet = new Set<string>();

    const startNode: Node = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, endX, endY),
      f: 0
    };
    startNode.f = startNode.h;

    openList.push(startNode);
    openMap.set(`${startX},${startY}`, 0);

    let iterations = 0;
    while (openList.size() > 0 && iterations < 2000) {
      iterations++;
      const current = openList.pop()!;
      const key = `${current.x},${current.y}`;

      if (current.x === endX && current.y === endY) {
        return this.reconstructPath(current, map.tileSize);
      }

      closedSet.add(key);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          
          const nx = current.x + dx;
          const ny = current.y + dy;
          const nKey = `${nx},${ny}`;

          if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;
          if (!map.isTilePassable(nx, ny)) continue;
          if (closedSet.has(nKey)) continue;

          const gScore = current.g + ((dx === 0 || dy === 0) ? 1 : 1.414);
          const existingG = openMap.get(nKey);

          if (existingG === undefined || gScore < existingG) {
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
            openMap.set(nKey, gScore);
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
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    return (dx + dy) + (1.414 - 2) * Math.min(dx, dy);
  }
}
