import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Sliders, Maximize2, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';

export function ControlBar({
  isRunning,
  speed,
  stats = {},
  grid = {},
  connected,
  onTogglePause,
  onSetSpeed,
  onResizeGrid,
  onReset
}) {
  const [newRows, setNewRows] = useState(grid.rows || 12);
  const [newCols, setNewCols] = useState(grid.cols || 16);
  const [isEditingGrid, setIsEditingGrid] = useState(false);

  const handleApplyResize = (e) => {
    e.preventDefault();
    onResizeGrid(parseInt(newRows), parseInt(newCols));
    setIsEditingGrid(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top metrics bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="stat-pill">
          <div style={{ padding: 8, borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="stat-val" style={{ color: '#10b981' }}>{stats.tasksCompleted || 0}</div>
            <div className="stat-label">Tasks Completed</div>
          </div>
        </div>

        <div className="stat-pill">
          <div style={{ padding: 8, borderRadius: 8, background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="stat-val" style={{ color: '#818cf8' }}>{stats.conflictsResolved || 0}</div>
            <div className="stat-label">Conflicts Resolved</div>
          </div>
        </div>

        <div className="stat-pill">
          <div style={{ padding: 8, borderRadius: 8, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            <RefreshCw size={20} />
          </div>
          <div>
            <div className="stat-val" style={{ color: '#f59e0b' }}>{stats.deadlocksRecovered || 0}</div>
            <div className="stat-label">Deadlocks Recovered</div>
          </div>
        </div>

        <div className="stat-pill">
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: connected ? '#10b981' : '#f43f5e',
              boxShadow: `0 0 8px ${connected ? '#10b981' : '#f43f5e'}`
            }}
          />
          <div>
            <div className="stat-val" style={{ fontSize: '0.95rem' }}>
              {connected ? 'LIVE TELEMETRY' : 'DISCONNECTED'}
            </div>
            <div className="stat-label">P2P Mesh Network</div>
          </div>
        </div>
      </div>

      {/* Control Actions Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '12px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16
        }}
      >
        {/* Play/Pause & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className={`btn ${isRunning ? 'btn-outline' : 'btn-primary'}`}
            onClick={onTogglePause}
            style={{ minWidth: 105 }}
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} />}
            {isRunning ? 'Pause' : 'Resume'}
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={onReset}
            title="Reset warehouse fleet & tasks"
          >
            <RotateCcw size={15} />
            Reset
          </button>
        </div>

        {/* Speed Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem', color: '#94a3b8' }}>
          <Sliders size={16} />
          <span>Speed:</span>
          <input
            type="range"
            min="200"
            max="1200"
            step="100"
            value={speed || 600}
            onChange={(e) => onSetSpeed(parseInt(e.target.value))}
            style={{ accentColor: '#06b6d4', width: 110 }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', minWidth: 50 }}>{speed || 600}ms</span>
        </div>

        {/* Grid Dimensions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!isEditingGrid ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setNewRows(grid.rows || 12);
                setNewCols(grid.cols || 16);
                setIsEditingGrid(true);
              }}
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              <Maximize2 size={14} />
              Grid: {grid.cols}x{grid.rows}
            </button>
          ) : (
            <form onSubmit={handleApplyResize} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                min="6"
                max="30"
                value={newCols}
                onChange={e => setNewCols(e.target.value)}
                style={{
                  width: 48,
                  padding: '4px 6px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontFamily: 'var(--font-mono)'
                }}
              />
              <span style={{ color: '#64748b' }}>x</span>
              <input
                type="number"
                min="6"
                max="30"
                value={newRows}
                onChange={e => setNewRows(e.target.value)}
                style={{
                  width: 48,
                  padding: '4px 6px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontFamily: 'var(--font-mono)'
                }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                Apply
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsEditingGrid(false)}
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                ✕
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
