import React, { useState } from 'react';
import { Play, Pause, Gauge, RotateCcw, Maximize2, CheckCircle2, Zap, ShieldCheck } from 'lucide-react';

export function ControlBar({
  isRunning,
  speed,
  stats,
  grid,
  connected,
  onTogglePause,
  onSetSpeed,
  onResizeGrid,
  onReset
}) {
  const [showResizeModal, setShowResizeModal] = useState(false);
  const [newRows, setNewRows] = useState(grid?.rows || 12);
  const [newCols, setNewCols] = useState(grid?.cols || 16);
  const [resizeError, setResizeError] = useState(null);

  const handleResizeSubmit = (e) => {
    e.preventDefault();
    setResizeError(null);
    const res = onResizeGrid(parseInt(newRows), parseInt(newCols));
    if (res && !res.success) {
      setResizeError(res.reason);
    } else {
      setShowResizeModal(false);
    }
  };

  return (
    <div className="glass-panel anim-fade-in" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Control Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ 
          width: 8, height: 8, borderRadius: '50%', 
          background: isRunning ? 'var(--status-emerald)' : 'var(--status-rose)',
          boxShadow: isRunning ? '0 0 8px rgba(4,120,87,0.5)' : 'none',
          transition: 'background 0.3s ease, box-shadow 0.3s ease'
        }} />
        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Simulation Engine — <span style={{ color: isRunning ? 'var(--status-emerald)' : 'var(--status-rose)' }}>{isRunning ? 'RUNNING' : 'PAUSED'}</span>
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        
        {/* Controls Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={onTogglePause}
            className={`btn ${isRunning ? 'btn-dark' : 'btn-primary'}`}
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} />}
            <span>{isRunning ? 'Pause Engine' : 'Resume Engine'}</span>
          </button>

          {/* Speed Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-light)' }}>
            <Gauge size={15} color="var(--brand-orange)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Speed:</span>
            <input
              type="range"
              min="100"
              max="1500"
              step="50"
              value={speed || 600}
              onChange={(e) => onSetSpeed(parseInt(e.target.value))}
              style={{ width: 90, accentColor: 'var(--brand-orange)' }}
              title={`${speed}ms per tick`}
            />
            <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 800, minWidth: 45 }}>
              {speed}ms
            </span>
          </div>

          {/* Grid Resize Toggle */}
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setNewRows(grid?.rows || 12);
              setNewCols(grid?.cols || 16);
              setResizeError(null);
              setShowResizeModal(true);
            }}
          >
            <Maximize2 size={15} />
            <span>Resize ({grid?.cols}x{grid?.rows})</span>
          </button>

          {/* Reset Simulation */}
          <button
            type="button"
            className="btn btn-outline"
            onClick={onReset}
            title="Reset simulation to factory state"
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>
        </div>

        {/* Telemetry Metrics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-pill">
            <CheckCircle2 size={18} color="var(--status-emerald)" />
            <div>
              <div className="stat-val">{stats?.tasksCompleted || 0}</div>
              <div className="stat-label">Tasks Completed</div>
            </div>
          </div>

          <div className="stat-pill">
            <Zap size={18} color="var(--brand-orange)" />
            <div>
              <div className="stat-val">{stats?.conflictsResolved || 0}</div>
              <div className="stat-label">Conflicts Resolved</div>
            </div>
          </div>

          <div className="stat-pill">
            <ShieldCheck size={18} color="var(--status-blue)" />
            <div>
              <div className="stat-val">{stats?.deadlocksRecovered || 0}</div>
              <div className="stat-label">Deadlocks Cleared</div>
            </div>
          </div>
        </div>
      </div>

      {/* Resize Modal */}
      {showResizeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-panel" style={{ width: 340, padding: 24, background: 'var(--bg-card)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }}>
              Resize Warehouse Grid
            </h3>

            {resizeError && (
              <div style={{ padding: '8px 12px', background: 'var(--status-rose-bg)', border: '1px solid var(--status-rose)', borderRadius: 6, color: 'var(--status-rose)', fontSize: '0.78rem', marginBottom: 12, fontWeight: 600 }}>
                {resizeError}
              </div>
            )}

            <form onSubmit={handleResizeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Columns (Width: 6 to 30)
                </label>
                <input
                  type="number"
                  min="6"
                  max="30"
                  value={newCols}
                  onChange={e => setNewCols(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Rows (Height: 6 to 30)
                </label>
                <input
                  type="number"
                  min="6"
                  max="30"
                  value={newRows}
                  onChange={e => setNewRows(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowResizeModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Apply Resize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
