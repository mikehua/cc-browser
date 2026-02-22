export class AssetManager {
  images: Record<string, HTMLCanvasElement> = {};

  constructor() {
    this.generateAssets();
  }

  generateAssets() {
    this.images['grass'] = this.createTile('#1e3c1a', '#1a3617', 'grass');
    this.images['water'] = this.createTile('#2b3f5c', '#354d70', 'water');
    this.images['sand'] = this.createTile('#7d6b4a', '#6e5d3f', 'sand');
    this.images['village'] = this.createTile('#4d3a26', '#3d2e1e', 'village');
    this.images['road'] = this.createTile('#4a4031', '#3d3428', 'road');

    this.images['gdi_tank_body'] = this.createVehicle('GDI', 'tank_body');
    this.images['gdi_tank_turret'] = this.createVehicle('GDI', 'tank_turret');
    this.images['gdi_apc'] = this.createVehicle('GDI', 'apc');
    this.images['gdi_humvee'] = this.createVehicle('GDI', 'humvee');
    this.images['gdi_infantry'] = this.createInfantry('GDI');

    this.images['nod_buggy'] = this.createVehicle('NOD', 'buggy');
    this.images['nod_tank_body'] = this.createVehicle('NOD', 'tank_body');
    this.images['nod_tank_turret'] = this.createVehicle('NOD', 'tank_turret');
    this.images['nod_infantry'] = this.createInfantry('NOD');
    this.images['nod_turret_base'] = this.createVehicle('NOD', 'turret_base');
    this.images['nod_turret_gun'] = this.createVehicle('NOD', 'turret_gun');
  }

  createTile(color1: string, color2: string, type: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, 32, 32);
    
    ctx.fillStyle = color2;
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 32;
      const y = Math.random() * 32;
      if (type === 'grass') {
        ctx.fillRect(x, y, 1, 2);
      } else if (type === 'water') {
        ctx.fillRect(x, y, 4, 1);
      } else if (type === 'road') {
        ctx.fillRect(x, y, 2, 1);
      } else {
        ctx.fillRect(x, y, 2, 2);
      }
    }
    return canvas;
  }

  createVehicle(side: string, part: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    const color = side === 'GDI' ? '#d4af37' : '#b22222';
    const darkColor = side === 'GDI' ? '#a6892a' : '#8a1a1a';

    ctx.translate(20, 20);

    if (part === 'tank_body') {
      ctx.fillStyle = '#222';
      ctx.fillRect(-14, -12, 28, 6);
      ctx.fillRect(-14, 6, 28, 6);
      ctx.fillStyle = color;
      ctx.fillRect(-12, -8, 24, 16);
      ctx.strokeStyle = darkColor;
      ctx.strokeRect(-12, -8, 24, 16);
    } else if (part === 'tank_turret') {
      ctx.fillStyle = color;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#444';
      ctx.fillRect(4, -2, 16, 4);
      ctx.strokeStyle = darkColor;
      ctx.strokeRect(-6, -6, 12, 12);
    } else if (part === 'apc') {
      ctx.fillStyle = '#222';
      ctx.fillRect(-16, -12, 32, 24);
      ctx.fillStyle = color;
      ctx.fillRect(-14, -10, 28, 20);
      ctx.fillStyle = '#333';
      for(let i=0; i<3; i++) ctx.fillRect(8, -6 + i*5, 2, 3);
    } else if (part === 'humvee' || part === 'buggy') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-10, -8); ctx.lineTo(12, -5); ctx.lineTo(12, 5); ctx.lineTo(-10, 8); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.fillRect(2, -4, 4, 8);
    } else if (part === 'turret_base') {
       ctx.fillStyle = '#333';
       ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.fill();
    } else if (part === 'turret_gun') {
       ctx.fillStyle = color;
       ctx.fillRect(-8, -8, 16, 16);
       ctx.fillStyle = '#000';
       ctx.fillRect(8, -2, 14, 4);
    }

    return canvas;
  }

  createInfantry(side: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 20;
    const ctx = canvas.getContext('2d')!;
    const color = side === 'GDI' ? '#d4af37' : '#b22222';

    ctx.translate(10, 10);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, -4, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillRect(-3, -1, 6, 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(2, 0, 5, 2);

    return canvas;
  }
}
