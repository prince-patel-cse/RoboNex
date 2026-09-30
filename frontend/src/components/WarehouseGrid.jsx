import React, { useRef, useEffect } from 'react';
import { Package, MapPin, AlertTriangle } from 'lucide-react';

const PRESET_COLORS = {
  R1: { bg: '#c2410c', border: '#9a3412' },
  R2: { bg: '#0f172a', border: '#1e293b' },
  R3: { bg: '#047857', border: '#065f46' },
  R4: { bg: '#1d4ed8', border: '#1e40af' }
};

export function getRobotColor(robotId) {
  if (PRESET_COLORS[robotId]) return PRESET_COLORS[robotId];
  let hash = 0;
  for (let i = 0; i < robotId.length; i++) {
    hash = robotId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return {
    bg: `hsl(${hue}, 75%, 40%)`,
    border: `hsl(${hue}, 75%, 30%)`
  };
}

// Compute directional arrow from one path step to the next
function getDirectionArrow(steps, currentX, currentY) {
  if (!steps || steps.length === 0) return null;
  // Sort by time step t, find earliest
  const sorted = [...steps].sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  const first = sorted[0];
  if (!first) return null;
  // We can't know the previous cell, so we just show a dot marker
  return null; // arrows are shown on path dots using robotId color
}

export function WarehouseGrid({
  grid,
  robots = [],
  tasks = [],
  events = [],
  interactionMode = 'BLOCK',
  onCellClick,
  selectedRobotId,
  onSelectRobot
}) {
  if (!grid) return null;

  const { rows, cols, blockedCells = [] } = grid;
  const blockedSet = new Set(blockedCells);

  // Map robots by "x,y"
  const robotMap = new Map();
  robots.forEach(r => {
    if (r.position) {
      robotMap.set(`${r.position.x},${r.position.y}`, r);
    }
  });

  // Map active pickup & delivery tasks
  const pickupMap = new Map();
  const deliveryMap = new Map();
  tasks.forEach(t => {
    if (t.status !== 'COMPLETED') {
      pickupMap.set(`${t.pickup.x},${t.pickup.y}`, t);
      deliveryMap.set(`${t.delivery.x},${t.delivery.y}`, t);
    }
  });

  // Collect planned path steps
  const pathSteps = new Map();
  robots.forEach(r => {
    if (r.path && r.path.length > 0) {
      r.path.forEach((step, idx) => {
        const key = `${step.x},${step.y}`;
        if (!pathSteps.has(key)) pathSteps.set(key, []);
        pathSteps.get(key).push({
          robotId: r.id,
          t: step.t,
          action: step.action,
          isFocus: selectedRobotId ? selectedRobotId === r.id : true,
          nextStep: r.path[idx + 1] || null,
          prevStep: r.path[idx - 1] || null
        });
      });
    }
  });

  // Robots currently rerouting (WAITING + recent REROUTE event)
  const reroutingRobots = new Set();
  const now = Date.now();
  events.forEach(e => {
    if ((e.source === 'REROUTE' || e.source === 'BLOCKED') && e.message) {
      // extract robot id from message like "R1 dynamically replanned..."
      const match = e.message.match(/^(R\d+)/);
      if (match) reroutingRobots.add(match[1]);
    }
  });

  // Direction arrow character from step coords
  const getArrow = (step) => {
    if (!step.nextStep) return null;
    const dx = step.nextStep.x - step.t; // can't reliably compute from t
    // use relative position if prev step exists
    if (step.prevStep) {
      const pdx = step.x - step.prevStep.x;
      const pdy = step.y - step.prevStep.y;
      if (pdx > 0) return '→';
      if (pdx < 0) return '←';
      if (pdy > 0) return '↓';
      if (pdy < 0) return '↑';
    }
    return null;
  };

  const handleCellClick = (x, y, robot) => {
    if (robot) {
      onSelectRobot(selectedRobotId === robot.id ? null : robot.id);
      return;
    }
    onCellClick(x, y);
  };

  const renderCells = () => {
    const elements = [];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const key = `${x},${y}`;
        const isBlocked = blockedSet.has(key);
        const robot = robotMap.get(key);
        const pickupTask = pickupMap.get(key);
        const deliveryTask = deliveryMap.get(key);
        const traversingSteps = pathSteps.get(key) || [];

        const isRerouting = robot && reroutingRobots.has(robot.id);
        const isSelected = robot && selectedRobotId === robot.id;

        let cellClasses = 'cell';
        if (isBlocked) cellClasses += ' blocked';
        if (pickupTask) cellClasses += ' pickup-point';
        if (deliveryTask) cellClasses += ' delivery-point';
        if (interactionMode === 'ADD_ROBOT' && !isBlocked && !robot) {
          cellClasses += ' add-robot-target';
        }

        const focusedTraverser = traversingSteps.find(s => s.isFocus);

        // Direction arrow for focused path
        let arrow = null;
        if (focusedTraverser && focusedTraverser.prevStep) {
          const pdx = focusedTraverser.x - focusedTraverser.prevStep.x;
          const pdy = focusedTraverser.y - focusedTraverser.prevStep.y;
          if (pdx > 0) arrow = '→';
          else if (pdx < 0) arrow = '←';
          else if (pdy > 0) arrow = '↓';
          else if (pdy < 0) arrow = '↑';
        }

        elements.push(
          <div
            key={key}
            className={cellClasses}
            onClick={() => handleCellClick(x, y, robot)}
            title={`(${x}, ${y}) ${isBlocked ? '[WALL]' : robot ? `[AMR ${robot.id}]` : ''}`}
            style={{
              cursor: interactionMode === 'ADD_ROBOT' && !isBlocked && !robot ? 'crosshair' : 'pointer'
            }}
          >
            {/* Coordinate watermark */}
            <span style={{ position: 'absolute', top: 2, left: 3, fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 600, opacity: isBlocked ? 0 : 0.85 }}>
              {x},{y}
            </span>

            {/* Task Markers */}
            {pickupTask && !robot && (
              <span title={`Pickup for Task ${pickupTask.id}`} style={{ color: 'var(--status-emerald)', zIndex: 2 }}>
                <Package size={16} />
              </span>
            )}
            {deliveryTask && !robot && (
              <span title={`Delivery for Task ${deliveryTask.id}`} style={{ color: 'var(--status-blue)', zIndex: 2 }}>
                <MapPin size={16} />
              </span>
            )}

            {/* Space-Time Reservation Path Dots + Direction Arrows */}
            {!robot && !isBlocked && traversingSteps.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, zIndex: 1 }}>
                <div style={{ display: 'flex', gap: 2, position: 'relative' }}>
                  {traversingSteps.map((step, idx) => {
                    const color = getRobotColor(step.robotId).bg;
                    return (
                      <div
                        key={`${step.robotId}-${idx}`}
                        className="path-dot"
                        style={{
                          backgroundColor: color,
                          opacity: step.isFocus ? 0.95 : 0.25,
                          transition: 'opacity 0.3s ease'
                        }}
                      />
                    );
                  })}
                </div>
                {/* Direction arrow for focused traverser */}
                {focusedTraverser && arrow && (
                  <span
                    className="path-arrow"
                    style={{ color: getRobotColor(focusedTraverser.robotId).bg }}
                  >
                    {arrow}
                  </span>
                )}
                {/* Reservation tick */}
                {focusedTraverser && (
                  <span style={{ fontSize: '0.52rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 800, lineHeight: 1 }}>
                    t={focusedTraverser.t}
                  </span>
                )}
              </div>
            )}

            {/* Robot Marker */}
            {robot && (
              <div style={{ position: 'relative' }}>
                <div
                  className={`robot-marker ${robot.status === 'MOVING' ? 'moving' : ''} ${isSelected ? 'selected-active' : ''}`}
                  style={{
                    backgroundColor: getRobotColor(robot.id).bg,
                    borderColor: isSelected ? 'var(--brand-orange)' : getRobotColor(robot.id).border,
                    borderWidth: isSelected ? 2 : 1,
                    borderStyle: 'solid',
                    boxShadow: !isSelected ? '0 2px 5px rgba(0,0,0,0.25)' : undefined,
                    opacity: robot.status === 'FAILED' ? 0.45 : 1
                  }}
                >
                  {robot.status === 'FAILED' ? (
                    <AlertTriangle size={13} color="#ffffff" />
                  ) : (
                    robot.id
                  )}
                  {/* Cargo payload badge */}
                  {robot.stage === 'TO_DELIVERY' && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -4,
                        right: -4,
                        width: 10,
                        height: 10,
                        background: 'var(--status-emerald)',
                        borderRadius: '50%',
                        border: '1.5px solid #ffffff'
                      }}
                      title="Carrying Cargo Payload"
                    />
                  )}
                </div>

                {/* SELECTED label below marker */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    bottom: -14,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--brand-orange)',
                    color: '#fff',
                    fontSize: '0.38rem',
                    fontWeight: 900,
                    padding: '1px 4px',
                    borderRadius: 2,
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.05em',
                    zIndex: 25,
                    pointerEvents: 'none'
                  }}>
                    ◉ ACTIVE
                  </div>
                )}

                {/* PATH RECALCULATING badge */}
                {isRerouting && !isSelected && (
                  <div className="rerouting-badge">↺ REROUTING</div>
                )}
                {isRerouting && isSelected && (
                  <div className="rerouting-badge" style={{ bottom: -24 }}>↺ REROUTING</div>
                )}
              </div>
            )}
          </div>
        );
      }
    }
    return elements;
  };

  return (
    <div className="grid-container">
      <div
        className="warehouse-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, var(--grid-cell-size))`,
          gridTemplateRows: `repeat(${rows}, var(--grid-cell-size))`
        }}
      >
        {renderCells()}
      </div>
    </div>
  );
}
