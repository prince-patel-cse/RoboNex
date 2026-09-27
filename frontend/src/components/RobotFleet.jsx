import React, { useState } from 'react';
import { Cpu, PlusCircle, AlertOctagon, RefreshCw, Zap, Crosshair } from 'lucide-react';
import { getRobotColor } from './WarehouseGrid';

const STATUS_CONFIG = {
  IDLE: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' },
  MOVING: { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  WAITING: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  PICKING_UP: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  DELIVERING: { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
  RECOVERING: { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
  BLOCKED: { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  FAILED: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.25)' }
};

export function RobotFleet({
  robots = [],
  onToggleFail,
  onAddRobot,
  interactionMode,
  setInteractionMode,
  selectedRobotId,
  onSelectRobot
}) {
  const [posX, setPosX] = useState('');
  const [posY, setPosY] = useState('');
  const [customId, setCustomId] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleManualAdd = (e) => {
    e.preventDefault();
    if (posX === '' || posY === '') return;
    onAddRobot({ x: parseInt(posX), y: parseInt(posY) }, customId || undefined);
    setPosX('');
    setPosY('');
    setCustomId('');
    setShowAddForm(false);
  };

  const selectedRobot = robots.find(r => r.id === selectedRobotId);

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cpu size={18} color="#06b6d4" />
          Autonomous Fleet ({robots.length})
        </h3>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={`btn ${interactionMode === 'ADD_ROBOT' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setInteractionMode(interactionMode === 'ADD_ROBOT' ? 'BLOCK' : 'ADD_ROBOT')}
            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
            title="Click any cell on the grid to deploy a robot"
          >
            <Crosshair size={13} />
            {interactionMode === 'ADD_ROBOT' ? 'Click Grid to Place' : 'Drop on Grid'}
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
          >
            <PlusCircle size={13} />
            Coord
          </button>
        </div>
      </div>

      {/* Manual Coordinate Deploy Form */}
      {showAddForm && (
        <form
          onSubmit={handleManualAdd}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0' }}>Deploy Robot at Coordinates</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <input
              type="number"
              placeholder="X"
              value={posX}
              onChange={e => setPosX(e.target.value)}
              required
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: '#fff',
                padding: '6px 8px',
                fontFamily: 'var(--font-mono)'
              }}
            />
            <input
              type="number"
              placeholder="Y"
              value={posY}
              onChange={e => setPosY(e.target.value)}
              required
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: '#fff',
                padding: '6px 8px',
                fontFamily: 'var(--font-mono)'
              }}
            />
            <input
              type="text"
              placeholder="ID (opt)"
              value={customId}
              onChange={e => setCustomId(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: '#fff',
                padding: '6px 8px',
                fontFamily: 'var(--font-mono)'
              }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            Deploy Robot
          </button>
        </form>
      )}

      {/* Selected Robot Space-Time Reservation Inspector */}
      {selectedRobot && (
        <div
          style={{
            padding: 10,
            borderRadius: 8,
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.3)',
            fontSize: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#818cf8' }}>
              🔍 Space-Time Inspector: {selectedRobot.id}
            </span>
            <button
              type="button"
              onClick={() => onSelectRobot(null)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
          <div style={{ color: '#cbd5e1' }}>
            Current: <strong>({selectedRobot.position?.x},{selectedRobot.position?.y})</strong>
          </div>
          {selectedRobot.path && selectedRobot.path.length > 0 ? (
            <div style={{ maxHeight: '70px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {selectedRobot.path.map((step, idx) => (
                <span
                  key={idx}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    padding: '2px 5px',
                    borderRadius: 4,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem'
                  }}
                >
                  ({step.x},{step.y})@t={step.t} [{step.action}]
                </span>
              ))}
            </div>
          ) : (
            <span style={{ color: '#64748b' }}>No active future reservations.</span>
          )}
        </div>
      )}

      {/* Fleet Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
        {robots.map(r => {
          const statusStyle = STATUS_CONFIG[r.status] || STATUS_CONFIG.IDLE;
          const isFailed = r.status === 'FAILED';
          const isSelected = selectedRobotId === r.id;
          const rColor = getRobotColor(r.id);

          return (
            <div
              key={r.id}
              onClick={() => onSelectRobot(isSelected ? null : r.id)}
              style={{
                padding: '12px 14px',
                background: isSelected ? 'rgba(99,102,241,0.1)' : isFailed ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isSelected ? rColor.bg : isFailed ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Header: ID, Status & Fail Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: rColor.bg,
                      boxShadow: `0 0 6px ${rColor.glow}`
                    }}
                  />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.id}</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 6,
                      color: statusStyle.color,
                      background: statusStyle.bg
                    }}
                  >
                    {r.status}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFail(r.id);
                  }}
                  style={{
                    background: isFailed ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                    color: isFailed ? '#10b981' : '#f43f5e',
                    border: 'none',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                  title={isFailed ? 'Revive Robot' : 'Simulate Breakdown'}
                >
                  {isFailed ? <RefreshCw size={12} /> : <AlertOctagon size={12} />}
                  {isFailed ? 'Revive' : 'Kill'}
                </button>
              </div>

              {/* Coordinates, Priority, Battery */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: '0.75rem', color: '#94a3b8' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>POSITION</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#f1f5f9' }}>
                    ({r.position?.x}, {r.position?.y})
                  </span>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>PRIORITY</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#a855f7', fontWeight: 600 }}>
                    ⚡ {r.effectivePriority || r.urgency}
                  </span>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>BATTERY</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: r.battery < 20 ? '#f43f5e' : '#10b981' }}>
                    {r.battery}%
                  </span>
                </div>
              </div>

              {/* Task Details */}
              {r.task && (
                <div style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Task <strong>{r.task.id}</strong> ({r.stage})</span>
                  <span>Target: ({r.stage === 'TO_PICKUP' ? `${r.task.pickup.x},${r.task.pickup.y}` : `${r.task.delivery.x},${r.task.delivery.y}`})</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
