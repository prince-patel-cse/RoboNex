import React, { useState } from 'react';
import { PlusCircle, Truck, Shuffle, AlertCircle, AlertTriangle, Zap, ArrowRight } from 'lucide-react';

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
    <div className="glass-panel anim-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Truck size={18} color="var(--brand-orange)" />
          Task Management
        </h3>
        <button
          type="button"
          onClick={handleRandomTask}
          className="btn btn-outline"
          style={{ padding: '5px 10px', fontSize: '0.78rem' }}
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
            background: 'var(--status-rose-bg)',
            border: '1px solid var(--status-rose)',
            borderRadius: 6,
            color: 'var(--status-rose)',
            fontSize: '0.78rem',
            fontWeight: 600,
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
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: 4 }}>
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
                style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
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
                style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: 4 }}>
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
                style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
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
                style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        </div>

        {/* Urgency */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 4 }}>
            <span>Priority Urgency:</span>
            <span style={{ color: urgency > 7 ? 'var(--status-rose)' : urgency > 4 ? 'var(--brand-orange)' : 'var(--status-emerald)', fontWeight: 800 }}>
              Level {urgency}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={urgency}
            onChange={e => setUrgency(e.target.value)}
            style={{ width: '100%', accentColor: 'var(--brand-orange)' }}
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
          <PlusCircle size={16} />
          Dispatch Task
        </button>
      </form>

      {/* Task Queue List */}
      <div style={{ marginTop: 4 }}>
        <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, marginBottom: 8 }}>
          Active Tasks ({tasks.length})
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '220px', overflowY: 'auto' }}>
          {tasks.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center', padding: '20px 8px' }}>
              <Truck size={28} color="var(--border-strong)" style={{ display: 'block', margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 3 }}>No tasks in queue</div>
              <div style={{ fontSize: '0.74rem' }}>Use the form above to dispatch pickup/delivery tasks, or try <strong style={{ color: 'var(--brand-orange)' }}>Auto Dispatch</strong>.</div>
            </div>
          ) : (
            tasks.slice(-8).reverse().map(t => {
              const isUnreachable = t.status === 'PENDING' && t.error;
              return (
                <div
                  key={t.id}
                  style={{
                    padding: '10px 12px',
                    background: isUnreachable ? 'var(--status-rose-bg)' : 'var(--bg-subtle)',
                    border: `1px solid ${isUnreachable ? 'var(--status-rose)' : 'var(--border-light)'}`,
                    borderRadius: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      <span>{t.id}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--brand-orange)', background: 'var(--brand-orange-light)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--brand-orange)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Zap size={11} color="var(--brand-orange)" /> P{t.urgency}
                      </span>
                      {isUnreachable && (
                        <span title={t.error} style={{ fontSize: '0.65rem', color: 'var(--status-rose)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <AlertTriangle size={12} />
                          No Path
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>({t.pickup.x},{t.pickup.y})</span>
                      <ArrowRight size={11} color="var(--text-muted)" />
                      <span>({t.delivery.x},{t.delivery.y})</span>
                    </div>
                    {isUnreachable && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--status-rose)', marginTop: 2, fontWeight: 600 }}>
                        Awaiting obstacle removal to resume
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      className={`badge-status ${
                        t.status === 'COMPLETED' ? 'badge-completed' :
                        t.status === 'ASSIGNED' ? 'badge-moving' :
                        isUnreachable ? 'badge-blocked' :
                        'badge-waiting'
                      }`}
                      title={t.error || ''}
                    >
                      {t.status === 'COMPLETED' ? 'DONE' : isUnreachable ? 'QUEUED' : t.assignedTo || t.status}
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
