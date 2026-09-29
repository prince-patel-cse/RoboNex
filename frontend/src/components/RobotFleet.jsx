import React, { useState } from 'react';
import { Bot, Battery, Plus, Power, AlertTriangle, Rotate3D, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getRobotColor } from './WarehouseGrid';
import { Robot3DViewer } from './Robot3DViewer';

function BatteryBar({ value }) {
  const color = value > 60
    ? 'var(--status-emerald)'
    : value > 25
    ? 'var(--status-amber)'
    : 'var(--status-rose)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <Battery size={12} color={color} style={{ flexShrink: 0 }} />
      <div className="battery-bar" style={{ flex: 1 }}>
        <div
          className="battery-fill"
          style={{ width: `${Math.max(2, value)}%`, background: color }}
        />
      </div>
      <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color, minWidth: 30, textAlign: 'right' }}>
        {value}%
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    MOVING:  { cls: 'badge-moving',  label: 'MOVING' },
    WAITING: { cls: 'badge-waiting', label: 'WAITING' },
    FAILED:  { cls: 'badge-blocked', label: 'FAILED' },
    IDLE:    { cls: 'badge-idle',    label: 'IDLE' }
  };
  const { cls, label } = map[status] || map.IDLE;
  return (
    <span className={`badge-status ${cls}`} style={{ transition: 'background 300ms ease, color 300ms ease' }}>
      {label}
    </span>
  );
}

export function RobotFleet({
  robots = [],
  onToggleFail,
  interactionMode,
  setInteractionMode,
  selectedRobotId,
  onSelectRobot
}) {
  const [inspectRobot3D, setInspectRobot3D] = useState(null);

  return (
    <div className="glass-panel anim-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={18} color="var(--brand-orange)" />
          Autonomous Fleet ({robots.length})
        </h3>
        <button
          type="button"
          className={`btn ${interactionMode === 'ADD_ROBOT' ? 'btn-primary' : 'btn-dark'}`}
          style={{ padding: '5px 10px', fontSize: '0.78rem' }}
          onClick={() => setInteractionMode(interactionMode === 'ADD_ROBOT' ? 'BLOCK' : 'ADD_ROBOT')}
        >
          <Plus size={14} />
          {interactionMode === 'ADD_ROBOT' ? 'Cancel Drop' : 'Drop on Grid'}
        </button>
      </div>

      {/* Robot Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '420px', overflowY: 'auto' }}>
        {robots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            <Bot size={32} color="var(--border-strong)" style={{ margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>No robots deployed</div>
            <div style={{ fontSize: '0.75rem' }}>
              Click <strong style={{ color: 'var(--brand-orange)' }}>Drop on Grid</strong> then click a cell to place a robot.
            </div>
          </div>
        ) : robots.map((r) => {
          const isSelected = selectedRobotId === r.id;
          const isFailed = r.status === 'FAILED';
          const robotTheme = getRobotColor(r.id);

          return (
            <div
              key={r.id}
              onClick={() => onSelectRobot(isSelected ? null : r.id)}
              style={{
                padding: '14px',
                background: isSelected ? 'var(--brand-orange-light)' : 'var(--bg-card)',
                border: `1px solid ${isSelected ? 'var(--brand-orange)' : 'var(--border-light)'}`,
                borderLeft: isSelected ? '3px solid var(--brand-orange)' : `1px solid var(--border-light)`,
                borderRadius: 10,
                boxShadow: isSelected ? '0 0 0 2px rgba(194,65,12,0.15), 0 4px 12px rgba(194,65,12,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
            >
              {/* Row 1: ID + ACTIVE badge + status + action buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Color dot avatar */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: robotTheme.bg,
                    color: '#fff',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isSelected ? `0 0 0 2px var(--brand-orange)` : 'none',
                    transition: 'box-shadow 0.2s ease'
                  }}>
                    {r.id}
                  </div>

                  <div>
                    {/* Robot ID — dominant */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                        {r.id}
                      </span>
                      {isSelected && (
                        <span style={{
                          fontSize: '0.58rem',
                          fontWeight: 900,
                          padding: '1px 6px',
                          borderRadius: 3,
                          background: 'var(--brand-orange)',
                          color: '#fff',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase'
                        }}>
                          ◉ ACTIVE
                        </span>
                      )}
                    </div>
                    {/* Position — small secondary */}
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      pos ({r.position.x}, {r.position.y})
                    </span>
                  </div>
                </div>

                {/* Right: status + buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StatusBadge status={r.status} />

                  <div className="tooltip-wrapper">
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '3px 7px', fontSize: '0.7rem' }}
                      onClick={(e) => { e.stopPropagation(); setInspectRobot3D(r); }}
                    >
                      <Rotate3D size={12} color="var(--brand-orange)" />
                    </button>
                    <span className="tooltip-label">View 3D CAD</span>
                  </div>

                  <div className="tooltip-wrapper">
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      onClick={(e) => { e.stopPropagation(); onToggleFail(r.id); }}
                    >
                      <Power size={12} />
                      {isFailed ? 'Revive' : 'Kill'}
                    </button>
                    <span className="tooltip-label">{isFailed ? 'Restore online' : 'Simulate failure'}</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Battery bar — visually dominant */}
              <BatteryBar value={r.battery ?? 100} />

              {/* Row 3: Task info — medium prominence */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 6,
                borderTop: '1px solid var(--border-light)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {r.taskId ? (
                    <>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.78rem' }}>
                        {r.taskId}
                      </span>
                      {r.stage && (
                        <span style={{
                          fontSize: '0.65rem',
                          padding: '1px 6px',
                          borderRadius: 3,
                          background: r.stage === 'TO_DELIVERY' ? 'var(--status-emerald-bg)' : 'var(--status-blue-bg)',
                          color: r.stage === 'TO_DELIVERY' ? 'var(--status-emerald)' : 'var(--status-blue)',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3
                        }}>
                          {r.stage === 'TO_DELIVERY' ? (
                            <><ArrowRight size={9} /> DELIVER</>
                          ) : (
                            <><ArrowRight size={9} /> PICKUP</>
                          )}
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.72rem' }}>No task — Idle</span>
                  )}
                </div>

                {/* Waiting ticks — small, only if relevant */}
                {r.waitingTime > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: 'var(--brand-orange)',
                    background: 'var(--brand-orange-light)',
                    padding: '1px 6px',
                    borderRadius: 4,
                    border: '1px solid var(--brand-orange)'
                  }}>
                    <AlertTriangle size={10} />
                    Wait {r.waitingTime}t · P{r.effectivePriority?.toFixed(0)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {inspectRobot3D && (
        <Robot3DViewer
          robot={inspectRobot3D}
          onClose={() => setInspectRobot3D(null)}
        />
      )}
    </div>
  );
}
