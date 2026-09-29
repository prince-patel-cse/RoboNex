import React, { useState } from 'react';
import { Bot, Battery, Plus, Power, AlertTriangle, Rotate3D } from 'lucide-react';
import { getRobotColor } from './WarehouseGrid';
import { Robot3DViewer } from './Robot3DViewer';

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
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '380px', overflowY: 'auto' }}>
        {robots.map((r) => {
          const isSelected = selectedRobotId === r.id;
          const isFailed = r.status === 'FAILED';
          const robotTheme = getRobotColor(r.id);

          return (
            <div
              key={r.id}
              onClick={() => onSelectRobot(isSelected ? null : r.id)}
              style={{
                padding: '12px 14px',
                background: isSelected ? 'var(--brand-orange-light)' : 'var(--bg-card)',
                border: `1px solid ${isSelected ? 'var(--brand-orange)' : 'var(--border-light)'}`,
                borderRadius: 8,
                boxShadow: isSelected ? '0 0 0 1px var(--brand-orange)' : '0 1px 2px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: robotTheme.bg,
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {r.id}
                  </div>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{r.id}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 6, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      ({r.position.x}, {r.position.y})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '3px 7px', fontSize: '0.7rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectRobot3D(r);
                    }}
                    title="View 3D Robot CAD Structure"
                  >
                    <Rotate3D size={12} color="var(--brand-orange)" />
                    3D
                  </button>

                  <span
                    className={`badge-status ${
                      r.status === 'MOVING' ? 'badge-moving' :
                      r.status === 'WAITING' ? 'badge-waiting' :
                      r.status === 'FAILED' ? 'badge-blocked' :
                      'badge-idle'
                    }`}
                  >
                    {r.status}
                  </span>

                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFail(r.id);
                    }}
                    title={isFailed ? 'Restore online' : 'Simulate hardware failure'}
                  >
                    <Power size={12} />
                    {isFailed ? 'Revive' : 'Kill'}
                  </button>
                </div>
              </div>

              {/* Task & Battery info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, paddingTop: 4, borderTop: '1px solid var(--border-light)' }}>
                <div>
                  Task: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{r.taskId || 'None (Idle)'}</strong>
                  {r.stage && <span style={{ fontSize: '0.68rem', color: 'var(--brand-orange)', marginLeft: 4, fontWeight: 700 }}>({r.stage})</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Battery size={13} color={r.battery > 50 ? 'var(--status-emerald)' : r.battery > 20 ? 'var(--status-amber)' : 'var(--status-rose)'} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{r.battery}%</span>
                </div>
              </div>

              {/* Dynamic priority indicator if waiting */}
              {r.waitingTime > 0 && (
                <div style={{ fontSize: '0.68rem', color: 'var(--brand-orange)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--brand-orange-light)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--brand-orange)' }}>
                  <AlertTriangle size={12} />
                  <span>Waiting {r.waitingTime} ticks (Effective Priority: {r.effectivePriority?.toFixed(1)})</span>
                </div>
              )}
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
