import React, { useState } from 'react';
import { PlusCircle, Zap, CheckCircle2, Clock, Truck, Shuffle, AlertCircle, AlertTriangle } from 'lucide-react';

export function TaskManager({ tasks = [], onAddTask, grid, actionError }) {
  const [pickupX, setPickupX] = useState('');
  const [pickupY, setPickupY] = useState('');
  const [deliveryX, setDeliveryX] = useState('');
  const [deliveryY, setDeliveryY] = useState('');
  const [urgency, setUrgency] = useState(5);
  const [localError, setLocalError] = useState(null);

  const blockedSet = new Set(grid?.blockedCells || []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError(null);

    if (pickupX === '' || pickupY === '' || deliveryX === '' || deliveryY === '') return;

    const px = parseInt(pickupX);
    const py = parseInt(pickupY);
    const dx = parseInt(deliveryX);
    const dy = parseInt(deliveryY);

    // Validation: Out of bounds
    if (grid) {
      if (px < 0 || px >= grid.cols || py < 0 || py >= grid.rows) {
        setLocalError(`Pickup (${px},${py}) is outside grid dimensions (${grid.cols}x${grid.rows})`);
        return;
      }
      if (dx < 0 || dx >= grid.cols || dy < 0 || dy >= grid.rows) {
        setLocalError(`Delivery (${dx},${dy}) is outside grid dimensions (${grid.cols}x${grid.rows})`);
        return;
      }
    }

    // Validation: Blocked cell check for Pickup
    if (blockedSet.has(`${px},${py}`)) {
      setLocalError(`Cannot accept task: Pickup cell (${px},${py}) is blocked by a wall/obstacle!`);
      return;
    }

    // Validation: Blocked cell check for Delivery
    if (blockedSet.has(`${dx},${dy}`)) {
      setLocalError(`Cannot accept task: Delivery cell (${dx},${dy}) is blocked by a wall/obstacle!`);
      return;
    }

    // Validation: Same cell check
    if (px === dx && py === dy) {
      setLocalError(`Pickup and delivery cannot be the exact same cell (${px},${py})`);
      return;
    }

    onAddTask({ x: px, y: py }, { x: dx, y: dy }, parseInt(urgency));

    // Reset inputs
    setPickupX('');
    setPickupY('');
    setDeliveryX('');
    setDeliveryY('');
  };

  const handleRandomTask = () => {
    if (!grid) return;
    setLocalError(null);
    const { rows, cols } = grid;

    const getRandomFreeCoord = () => {
      let tries = 0;
      while (tries < 100) {
        const x = Math.floor(Math.random() * cols);
        const y = Math.floor(Math.random() * rows);
        if (!blockedSet.has(`${x},${y}`)) return { x, y };
        tries++;
      }
      return { x: 0, y: 0 };
    };

    const p = getRandomFreeCoord();
    let d = getRandomFreeCoord();
    while (p.x === d.x && p.y === d.y) {
      d = getRandomFreeCoord();
    }

    const randUrgency = Math.floor(Math.random() * 9) + 1;
    onAddTask(p, d, randUrgency);
  };

  const activeError = localError || actionError;

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Truck size={18} color="#6366f1" />
          Task Management
        </h3>
        <button
          type="button"
          onClick={handleRandomTask}
          className="btn btn-outline"
          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          title="Dispatch a random pickup/delivery task"
        >
          <Shuffle size={14} />
          Auto Dispatch
        </button>
      </div>

      {/* Error Banner */}
      {activeError && (
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            borderRadius: 8,
            color: '#f43f5e',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{activeError}</span>
        </div>
      )}

      {/* Add Task Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
              Pickup (X, Y)
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="number"
                placeholder="X"
                value={pickupX}
                onChange={e => {
                  setPickupX(e.target.value);
                  setLocalError(null);
                }}
                required
                style={{
                  width: '100%',
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
                value={pickupY}
                onChange={e => {
                  setPickupY(e.target.value);
                  setLocalError(null);
                }}
                required
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  color: '#fff',
                  padding: '6px 8px',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
              Delivery (X, Y)
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="number"
                placeholder="X"
                value={deliveryX}
                onChange={e => {
                  setDeliveryX(e.target.value);
                  setLocalError(null);
                }}
                required
                style={{
                  width: '100%',
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
                value={deliveryY}
                onChange={e => {
                  setDeliveryY(e.target.value);
                  setLocalError(null);
                }}
                required
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  color: '#fff',
                  padding: '6px 8px',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Urgency */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>
            <span>Task Urgency Priority:</span>
            <span style={{ color: urgency > 7 ? '#f43f5e' : urgency > 4 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
              Level {urgency}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={urgency}
            onChange={e => setUrgency(e.target.value)}
            style={{ width: '100%', accentColor: '#6366f1' }}
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
          <PlusCircle size={16} />
          Create Task
        </button>
      </form>

      {/* Task Queue List */}
      <div style={{ marginTop: 8 }}>
        <h4 style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Recent Tasks ({tasks.length})
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '220px', overflowY: 'auto' }}>
          {tasks.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '16px 0' }}>
              No active tasks. Dispatch one above.
            </div>
          ) : (
            tasks.slice(-8).reverse().map(t => {
              const isUnreachable = t.status === 'PENDING' && t.error;
              return (
                <div
                  key={t.id}
                  style={{
                    padding: '10px 12px',
                    background: isUnreachable ? 'rgba(244,63,94,0.06)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isUnreachable ? 'rgba(244,63,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.85rem' }}>
                      <span>{t.id}</span>
                      <span style={{ fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '1px 6px', borderRadius: 4 }}>
                        ⚡ {t.urgency}
                      </span>
                      {isUnreachable && (
                        <span title={t.error} style={{ fontSize: '0.65rem', color: '#f43f5e', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <AlertTriangle size={12} />
                          No Path
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      ({t.pickup.x},{t.pickup.y}) ➔ ({t.delivery.x},{t.delivery.y})
                    </div>
                    {isUnreachable && (
                      <div style={{ fontSize: '0.68rem', color: '#f43f5e', marginTop: 2 }}>
                        Awaiting obstacle removal to resume
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background:
                          t.status === 'COMPLETED' ? 'rgba(16,185,129,0.15)' :
                          t.status === 'ASSIGNED' ? 'rgba(99,102,241,0.15)' :
                          isUnreachable ? 'rgba(244,63,94,0.2)' :
                          'rgba(245,158,11,0.15)',
                        color:
                          t.status === 'COMPLETED' ? '#10b981' :
                          t.status === 'ASSIGNED' ? '#818cf8' :
                          isUnreachable ? '#f43f5e' :
                          '#f59e0b'
                      }}
                      title={t.error || ''}
                    >
                      {t.status === 'COMPLETED' ? 'DONE' : isUnreachable ? 'QUEUED (BLOCKED)' : t.assignedTo || t.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
