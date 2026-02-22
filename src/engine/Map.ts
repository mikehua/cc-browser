export enum TerrainType {
  GRASS = 0,
  WATER = 1,
  BRIDGE = 2,
  CLIFF = 3,
  ROAD = 4,
  TREE = 5,
  VILLAGE = 6
}

export class GameMap {
  width: number;
  height: number;
  tileSize: number;
  tiles: TerrainType[][];
  shroud: boolean[][];
  revealed: boolean[][];

  constructor(width: number, height: number, tileSize: number) {
    this.width = Math.floor(width);
    this.height = Math.floor(height);
    this.tileSize = tileSize;
    this.tiles = Array.from({ length: this.height }, () => Array(this.width).fill(TerrainType.GRASS));
    this.shroud = Array.from({ length: this.height }, () => Array(this.width).fill(true));
    this.revealed = Array.from({ length: this.height }, () => Array(this.width).fill(false));

    this.generateBialystokMap();
  }

  generateBialystokMap() {
    const W = this.width;
    const H = this.height;

    // 1. Winding River
    for (let y = 0; y < H; y++) {
      let x = Math.floor(W * 0.4);
      if (y > H * 0.3 && y < H * 0.7) x += Math.floor(Math.sin((y - H*0.3) * 0.2) * 8);
      
      this.setTile(x, y, TerrainType.WATER);
      this.setTile(x + 1, y, TerrainType.WATER);
      this.setTile(x - 1, y, TerrainType.WATER);
    }

    // 2. The Bridge
    const bridgeY = Math.floor(H * 0.5);
    const riverXAtBridge = Math.floor(W * 0.4 + Math.sin((bridgeY - H*0.3) * 0.2) * 8);
    for (let x = riverXAtBridge - 2; x <= riverXAtBridge + 3; x++) {
      this.setTile(x, bridgeY, TerrainType.BRIDGE);
    }

    // 3. The Road
    for (let x = 0; x < W; x++) {
       let y = bridgeY;
       if (x < riverXAtBridge) {
          y = bridgeY;
       } else {
          y = bridgeY + Math.floor((x - riverXAtBridge) * 0.2);
       }
       this.setTile(x, y, TerrainType.ROAD);
    }

    // 4. Villages
    this.createVillage(Math.floor(W * 0.3), Math.floor(H * 0.2), 3);
    this.createVillage(Math.floor(W * 0.8), Math.floor(H * 0.6), 5);

    // 5. Cliffs
    const cliffX = Math.floor(W * 0.6);
    for (let y = 0; y < H * 0.4; y++) this.setTile(cliffX, y, TerrainType.CLIFF);
    for (let y = Math.floor(H * 0.7); y < H; y++) this.setTile(cliffX, y, TerrainType.CLIFF);

    // 6. Trees
    for (let i = 0; i < 60; i++) {
      const tx = Math.floor(Math.random() * W);
      const ty = Math.floor(Math.random() * H);
      if (this.tiles[ty] && this.tiles[ty][tx] === TerrainType.GRASS) this.setTile(tx, ty, TerrainType.TREE);
    }
  }

  createVillage(x: number, y: number, size: number) {
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (Math.random() > 0.4) this.setTile(x + i, y + j, TerrainType.VILLAGE);
      }
    }
  }

  setTile(x: number, y: number, type: TerrainType) {
    if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
      if (this.tiles[y]) {
        this.tiles[y][x] = type;
      }
    }
  }

  isTilePassable(tx: number, ty: number): boolean {
    if (ty < 0 || ty >= this.height || tx < 0 || tx >= this.width) return false;
    if (!this.tiles[ty]) return false;
    const tile = this.tiles[ty][tx];
    return tile !== TerrainType.WATER && tile !== TerrainType.CLIFF;
  }

  isPassable(pixelX: number, pixelY: number): boolean {
    const tx = Math.floor(pixelX / this.tileSize);
    const ty = Math.floor(pixelY / this.tileSize);
    return this.isTilePassable(tx, ty);
  }

  revealShroud(pixelX: number, pixelY: number, radius: number) {
    const centerTx = Math.floor(pixelX / this.tileSize);
    const centerTy = Math.floor(pixelY / this.tileSize);
    const range = Math.ceil(radius / this.tileSize);
    for (let y = centerTy - range; y <= centerTy + range; y++) {
      for (let x = centerTx - range; x <= centerTx + range; x++) {
        if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
          const dx = x - centerTx;
          const dy = y - centerTy;
          if (dx * dx + dy * dy <= range * range) {
            if (this.shroud[y]) this.shroud[y][x] = false;
            if (this.revealed[y]) this.revealed[y][x] = true;
          }
        }
      }
    }
  }
}
