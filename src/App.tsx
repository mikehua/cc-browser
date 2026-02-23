import { useEffect, useRef, useState, useMemo, useCallback, FC, MouseEvent } from 'react';
import { GameEngine } from './engine/GameEngine';
import { Vector2 } from './engine/Unit';
import { TerrainType } from './engine/Map';
import { AssetManager } from './engine/AssetManager';

interface Ping {
  pos: Vector2;
  life: number;
}

const App: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  const assets = useMemo(() => new AssetManager(), []);
  const [engine, setEngine] = useState(() => new GameEngine(Math.max(800, window.innerWidth - 250), Math.max(600, window.innerHeight)));
  const [pings, setPings] = useState<Ping[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ start: Vector2, end: Vector2 } | null>(null);
  const [isReady, setIsReady] = useState(false);

  const restartGame = useCallback(() => {
    setEngine(new GameEngine(Math.max(800, window.innerWidth - 250), Math.max(600, window.innerHeight)));
    mapCanvasRef.current = null;
  }, []);

  const preRenderMap = useCallback(() => {
    if (!engine || !assets) return null;
    const canvas = document.createElement('canvas');
    canvas.width = engine.width;
    canvas.height = engine.height;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    const tileSize = engine.map.tileSize;

    for(let y=0; y<engine.map.height; y++) {
      for(let x=0; x<engine.map.width; x++) {
        const tile = engine.map.tiles[y][x];
        let img = assets.images['grass'];
        if (tile === TerrainType.WATER) img = assets.images['water'];
        else if (tile === TerrainType.ROAD) img = assets.images['road'];
        else if (tile === TerrainType.CLIFF) img = assets.images['sand'];
        else if (tile === TerrainType.VILLAGE) img = assets.images['village'];
        else if (tile === TerrainType.BRIDGE) img = assets.images['road'];
        ctx.drawImage(img, x * tileSize, y * tileSize, tileSize, tileSize);
        if (tile === TerrainType.TREE) {
           ctx.fillStyle = '#0f290b';
           ctx.beginPath(); ctx.arc(x * tileSize + 16, y * tileSize + 16, 10, 0, Math.PI*2); ctx.fill();
        }
      }
    }
    return canvas;
  }, [engine, assets]);

  useEffect(() => {
    if (!assets) return;
    setIsReady(true);
  }, [assets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engine || !assets || !isReady) return;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    
    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min(0.1, (timestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = timestamp;

      engine.update(dt);
      setPings(prev => prev.map(p => ({ ...p, life: p.life - dt * 60 })).filter(p => p.life > 0));

      if (!mapCanvasRef.current) mapCanvasRef.current = preRenderMap();
      if (mapCanvasRef.current) ctx.drawImage(mapCanvasRef.current, 0, 0);

      const tileSize = engine.map.tileSize;
      engine.units.forEach(u => {
        const tx = Math.floor(u.pos.x / tileSize);
        const ty = Math.floor(u.pos.y / tileSize);
        if (ty >= 0 && ty < engine.map.height && tx >= 0 && tx < engine.map.width) {
          if (engine.map.shroud[ty][tx]) return;
        }
        ctx.save();
        ctx.translate(u.pos.x, u.pos.y);
        ctx.save();
        ctx.rotate(u.angle);
        let bodyImg = u.side === 'GDI' ? assets.images['gdi_humvee'] : assets.images['nod_buggy'];
        if (u.type === 'medium_tank') bodyImg = assets.images['gdi_tank_body'];
        else if (u.type === 'apc') bodyImg = assets.images['gdi_apc'];
        else if (u.type === 'nod_light_tank') bodyImg = assets.images['nod_tank_body'];
        else if (u.type === 'nod_turret') bodyImg = assets.images['nod_turret_base'];
        else if (u.type.includes('infantry') || u.type === 'minigunner') bodyImg = u.side === 'GDI' ? assets.images['gdi_infantry'] : assets.images['nod_infantry'];
        ctx.drawImage(bodyImg, -bodyImg.width/2, -bodyImg.height/2);
        ctx.restore();
        if (u.type.includes('tank') || u.type === 'nod_turret') {
          ctx.save();
          ctx.rotate(u.turretAngle || u.angle);
          const turretImg = u.side === 'GDI' ? assets.images['gdi_tank_turret'] : (u.type === 'nod_turret' ? assets.images['nod_turret_gun'] : assets.images['nod_tank_turret']);
          ctx.drawImage(turretImg, -turretImg.width/2, -turretImg.height/2);
          ctx.restore();
        }
        if (u.isSelected) {
          ctx.strokeStyle = '#0f0';
          ctx.strokeRect(-20, -20, 40, 40);
        }
        ctx.restore();
        const hpWidth = 30;
        ctx.fillStyle = '#000';
        ctx.fillRect(u.pos.x - hpWidth/2, u.pos.y - 25, hpWidth, 4);
        const hpPercent = u.health / (u.type === 'medium_tank' ? 400 : (u.type === 'apc' ? 300 : 100));
        ctx.fillStyle = hpPercent > 0.5 ? '#0f0' : (hpPercent > 0.2 ? '#ff0' : '#f00');
        ctx.fillRect(u.pos.x - hpWidth/2, u.pos.y - 25, Math.max(0, hpPercent * hpWidth), 4);
      });

      // 5. Draw Projectiles
      engine.projectiles.forEach(p => {
        const tx = Math.floor(p.pos.x / tileSize);
        const ty = Math.floor(p.pos.y / tileSize);
        if (ty >= 0 && ty < engine.map.height && tx >= 0 && tx < engine.map.width) {
          if (engine.map.shroud[ty][tx]) return;
        }
        ctx.fillStyle = p.type === 'shell' || p.type === 'rocket' ? '#fb0' : '#fff';
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.type === 'bullet' ? 1.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 6. Draw Shroud
        ctx.strokeStyle = `rgba(0, 255, 0, ${p.life / 20})`;
        ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, (20 - p.life) * 2, 0, Math.PI * 2); ctx.stroke();
      });

      if (selectionBox) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(selectionBox.start.x, selectionBox.start.y, selectionBox.end.x - selectionBox.start.x, selectionBox.end.y - selectionBox.start.y);
        ctx.setLineDash([]);
      }

      requestAnimationFrame(loop);
    };

    const id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [engine, assets, preRenderMap, pings, selectionBox, isReady]);

  const handleMouseDown = (e: MouseEvent) => {
    if (engine.missionState === 'WIN' || engine.missionState === 'LOSS') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (e.button === 0) setSelectionBox({ start: { x, y }, end: { x, y } });
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (selectionBox) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setSelectionBox({ ...selectionBox, end: { x: e.clientX - rect.left, y: e.clientY - rect.top } });
    }
  };
  const handleMouseUp = () => {
    if (selectionBox) {
      engine.selectUnitsInBox(selectionBox.start, selectionBox.end);
      setSelectionBox(null);
    }
  };
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    if (engine.missionState === 'WIN' || engine.missionState === 'LOSS') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPings(prev => [...prev, { pos: { x, y }, life: 20 }]);
    setTimeout(() => {
      const clickedUnit = engine.getUnitAt({ x, y });
      if (clickedUnit && clickedUnit.side === 'NOD') engine.issueAttackCommand(clickedUnit);
      else engine.issueMoveCommand({ x, y });
    }, 0);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#000', userSelect: 'none', fontFamily: 'monospace' }}>
      {!isReady && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', color: '#d4af37', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>INITIALIZING COMMAND LINK...</div>}
      <div style={{ position: 'relative', flex: 1 }}>
        <canvas
          ref={canvasRef}
          width={window.innerWidth - 250}
          height={window.innerHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
          style={{ cursor: 'crosshair', imageRendering: 'pixelated', backgroundColor: '#000' }}
        />
        {(engine.missionState === 'WIN' || engine.missionState === 'LOSS') && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <h1 style={{ color: engine.missionState === 'WIN' ? '#d4af37' : '#f00', fontSize: '64px', margin: '0 0 20px 0', textShadow: '4px 4px #000', letterSpacing: '5px' }}>{engine.missionState === 'WIN' ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED'}</h1>
            <button onClick={restartGame} style={{ backgroundColor: '#333', color: '#d4af37', border: '3px solid #d4af37', padding: '15px 40px', fontSize: '24px', cursor: 'pointer', fontWeight: 'bold' }}>Restart Mission</button>
          </div>
        )}
      </div>
      <div style={{ width: '250px', background: '#222', borderLeft: '4px solid #444', padding: '15px', color: '#d4af37', display: 'flex', flexDirection: 'column' }}>
         <h2 style={{ textAlign: 'center', borderBottom: '2px solid #d4af37', paddingBottom: '10px' }}>GDI COMMAND</h2>
         <div style={{ flex: 1 }}>
            <div style={{ color: '#0f0', fontSize: '14px', marginBottom: '10px' }}>MISSION: BIALYSTOK</div>
            <p style={{ fontSize: '12px', color: '#ccc' }}>Goal: Destroy all Nod forces.</p>
            <div style={{ background: '#000', height: '180px', border: '2px solid #555', marginTop: '20px', position: 'relative', overflow: 'hidden' }}>
               <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#0f0', textAlign: 'center', fontSize: '12px' }}>SATELLITE LINK<br/>RE-ESTABLISHED</div>
               <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)', backgroundSize: '100% 4px', pointerEvents: 'none' }}></div>
            </div>
            <div style={{ marginTop: '20px', borderTop: '1px solid #555', paddingTop: '10px' }}>
               <div style={{ fontSize: '14px', marginBottom: '5px' }}>CONTROLS:</div>
               <div style={{ fontSize: '11px', color: '#ccc' }}>- SELECT: Left Click & Drag</div>
               <div style={{ fontSize: '11px', color: '#ccc' }}>- MOVE/ATTACK: Right Click</div>
            </div>
         </div>
         <div style={{ borderTop: '2px solid #555', paddingTop: '10px' }}>
            <div style={{ fontSize: '14px' }}>OBJECTIVE:</div>
            <div style={{ fontSize: '11px', color: '#fff' }}>- Destroy all Nod forces</div>
         </div>
         <div style={{ marginTop: '20px', fontSize: '18px', fontWeight: 'bold' }}>CREDITS: 5000</div>
         <button onClick={restartGame} style={{ marginTop: '20px', background: '#444', color: '#fff', border: '1px solid #666', padding: '5px', fontSize: '10px', cursor: 'pointer' }}>RESTART MISSION</button>
      </div>
    </div>
  );
};

export default App;
