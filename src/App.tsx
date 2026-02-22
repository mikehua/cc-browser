import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { GameEngine } from './engine/GameEngine';
import { Vector2 } from './engine/Unit';
import { TerrainType } from './engine/Map';
import { AssetManager } from './engine/AssetManager';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const assets = useMemo(() => new AssetManager(), []);
  const [engine, setEngine] = useState(() => new GameEngine(Math.max(800, window.innerWidth - 250), Math.max(600, window.innerHeight)));
  const [selectionBox, setSelectionBox] = useState<{ start: Vector2, end: Vector2 } | null>(null);
  const [, setTick] = useState(0);

  const restartGame = useCallback(() => {
    setEngine(new GameEngine(Math.max(800, window.innerWidth - 250), Math.max(600, window.innerHeight)));
  }, []);

  useEffect(() => {
    const loop = () => {
      engine.update();
      setTick(t => t + 1);
      requestAnimationFrame(loop);
    };
    const id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [engine]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const tileSize = engine.map.tileSize;

    // 1. Render Terrain Tiles
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
           ctx.drawImage(assets.images['grass'], x * tileSize, y * tileSize, tileSize, tileSize);
           ctx.fillStyle = '#0f290b';
           ctx.beginPath(); ctx.arc(x * tileSize + 16, y * tileSize + 16, 10, 0, Math.PI*2); ctx.fill();
        }
      }
    }

    // 2. Render Units
    engine.units.forEach(u => {
      const tx = Math.floor(u.pos.x / tileSize);
      const ty = Math.floor(u.pos.y / tileSize);
      if (ty >= 0 && ty < engine.map.height && tx >= 0 && tx < engine.map.width) {
        if (engine.map.shroud[ty][tx]) return;
      }

      ctx.save();
      ctx.translate(u.pos.x, u.pos.y);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-10, 8, 20, 10);

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
        ctx.lineWidth = 1;
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

    // 3. Shroud
    ctx.fillStyle = '#000';
    for(let y=0; y<engine.map.height; y++) {
      for(let x=0; x<engine.map.width; x++) {
        if (engine.map.shroud[y][x]) {
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }

    // 4. Projectiles
    engine.projectiles.forEach(p => {
       const tx = Math.floor(p.pos.x / tileSize);
       const ty = Math.floor(p.pos.y / tileSize);
       if (ty >= 0 && ty < engine.map.height && tx >= 0 && tx < engine.map.width) {
          if (engine.map.shroud[ty][tx]) return;
       }
       ctx.fillStyle = p.type === 'shell' ? '#fb0' : '#fff';
       ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.type === 'shell' ? 3 : 1.5, 0, Math.PI*2); ctx.fill();
    });

    if (selectionBox) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(selectionBox.start.x, selectionBox.start.y, selectionBox.end.x - selectionBox.start.x, selectionBox.end.y - selectionBox.start.y);
      ctx.setLineDash([]);
    }
  }, [engine.units, engine.projectiles, engine.map, selectionBox, assets]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (engine.missionState === 'WIN' || engine.missionState === 'LOSS') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (e.button === 0) setSelectionBox({ start: { x, y }, end: { x, y } });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
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
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (engine.missionState === 'WIN' || engine.missionState === 'LOSS') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const clickedUnit = engine.getUnitAt({ x, y });
    if (clickedUnit && clickedUnit.side === 'NOD') engine.issueAttackCommand(clickedUnit);
    else engine.issueMoveCommand({ x, y });
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#000', userSelect: 'none', fontFamily: 'monospace' }}>
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
        
        {/* Mission Accomplished / Failed Overlay */}
        {(engine.missionState === 'WIN' || engine.missionState === 'LOSS') && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            animation: 'fadeIn 1s ease-out'
          }}>
            <h1 style={{ 
              color: engine.missionState === 'WIN' ? '#d4af37' : '#f00', 
              fontSize: '64px', 
              margin: '0 0 20px 0',
              textShadow: '4px 4px #000',
              letterSpacing: '5px'
            }}>
              {engine.missionState === 'WIN' ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED'}
            </h1>
            <p style={{ color: '#fff', fontSize: '18px', marginBottom: '40px' }}>
              {engine.missionState === 'WIN' ? 'The village of Bialystok has been liberated.' : 'GDI forces have been neutralized.'}
            </p>
            <button 
              onClick={restartGame}
              style={{
                backgroundColor: '#333',
                color: '#d4af37',
                border: '3px solid #d4af37',
                padding: '15px 40px',
                fontSize: '24px',
                cursor: 'pointer',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#444')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#333')}
            >
              Restart Mission
            </button>
          </div>
        )}
      </div>

      <div style={{ width: '250px', background: '#222', borderLeft: '4px solid #444', padding: '15px', color: '#d4af37', display: 'flex', flexDirection: 'column' }}>
         <h2 style={{ textAlign: 'center', borderBottom: '2px solid #d4af37', paddingBottom: '10px' }}>GDI COMMAND</h2>
         <div style={{ flex: 1 }}>
            <div style={{ color: '#0f0', fontSize: '14px', marginBottom: '10px' }}>MISSION: BIALYSTOK</div>
            <p style={{ fontSize: '12px', color: '#ccc' }}>Goal: Destroy all Nod forces.</p>
            
            <div style={{ background: '#000', height: '180px', border: '2px solid #555', marginTop: '20px', position: 'relative', overflow: 'hidden' }}>
               <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#0f0', textAlign: 'center', fontSize: '12px' }}>
                  SATELLITE LINK<br/>RE-ESTABLISHED
               </div>
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
            {engine.missionState === 'START' && (
               <div style={{ fontSize: '10px', color: '#888', marginTop: '5px' }}>* Scout East for reinforcements</div>
            )}
            {engine.missionState !== 'START' && (
               <div style={{ fontSize: '10px', color: '#0f0', marginTop: '5px' }}>* Reinforcements arrived</div>
            )}
         </div>
         <div style={{ marginTop: '20px', fontSize: '18px', fontWeight: 'bold' }}>CREDITS: 5000</div>
         <button 
           onClick={restartGame}
           style={{ marginTop: '20px', background: '#444', color: '#fff', border: '1px solid #666', padding: '5px', fontSize: '10px', cursor: 'pointer' }}
         >
           RESTART MISSION
         </button>
      </div>
    </div>
  );
};

export default App;
