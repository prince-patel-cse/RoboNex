import React from 'react';
import { Package, MapPin, AlertTriangle, Bot } from 'lucide-react';

const PRESET_COLORS = {
  R1: { bg: '#6366f1', glow: 'rgba(99, 102, 241, 0.6)', border: '#818cf8' },
  R2: { bg: '#06b6d4', glow: 'rgba(6, 182, 212, 0.6)', border: '#22d3ee' },
  R3: { bg: '#10b981', glow: 'rgba(16, 185, 129, 0.6)', border: '#34d399' },
  R4: { bg: '#f59e0b', glow: 'rgba(245, 158, 11, 0.6)', border: '#fbbf24' }
};

export function getRobotColor(robotId) {
  if (PRESET_COLORS[robotId]) return PRESET_COLORS[robotId];
  // Deterministic HSL color generator for dynamic robots (R5, R6...)
  let hash = 0;
  for (let i = 0; i < robotId.length; i++) {
    hash = robotId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return {
    bg: `hsl(${hue}, 80%, 55%)`,
    glow: `hsla(${hue}, 80%, 55%, 0.6)`,
    border: `hsl(${hue}, 80%, 70%)`
  };
}

export function WarehouseGrid({
  grid,
  robots = [],
  tasks = [],
  interactionMode = 'BLOCK', // 'BLOCK' | 'ADD_ROBOT'
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
  // "x,y" -> Array of { robotId, t, action }
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
          isFocus: selectedRobotId ? selectedRobotId === r.id : true
        });
      });
    }
  });

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

        let cellClasses = 'cell';
        if (isBlocked) cellClasses += ' blocked';
        if (pickupTask) cellClasses += ' pickup-point';
        if (deliveryTask) cellClasses += ' delivery-point';
        if (interactionMode === 'ADD_ROBOT' && !isBlocked && !robot) {
          cellClasses += ' add-robot-target';
        }

        const focusedTraverser = traversingSteps.find(s => s.isFocus);

        elements.push(
          <div
            key={key}
            className={cellClasses}
            onClick={() => handleCellClick(x, y, robot)}
            title={`(${x}, ${y}) ${isBlocked ? '[BLOCKED]' : robot ? `[ROBOT ${robot.id}]` : ''}`}
            style={{
              cursor: interactionMode === 'ADD_ROBOT' && !isBlocked && !robot ? 'crosshair' : 'pointer'
            }}
          >
            {/* Coordinate watermark */}
            <span style={{ position: 'absolute', top: 2, left: 3, fontSize: '0.52rem', opacity: 0.35 }}>
              {x},{y}
            </span>

            {/* Task Markers */}
            {pickupTask && !robot && (
              <span title={`Pickup for ${pickupTask.id}`} style={{ color: '#10b981', zIndex: 2 }}>
                <Package size={15} />
              </span>
            )}
            {deliveryTask && !robot && (
              <span title={`Delivery for ${deliveryTask.id}`} style={{ color: '#06b6d4', zIndex: 2 }}>
                <MapPin size={15} />
              </span>
            )}

            {/* Space-Time Reservation Planned Dots */}
            {!robot && !isBlocked && traversingSteps.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, zIndex: 1 }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {traversingSteps.map((step, idx) => {
                    const color = getRobotColor(step.robotId).bg;
                    return (
                      <div
                        key={`${step.robotId}-${idx}`}
                        className="path-dot"
                        style={{
                          backgroundColor: color,
                          boxShadow: `0 0 5px ${color}`,
                          opacity: step.isFocus ? 0.9 : 0.25
                        }}
                      />
                    );
                  })}
                </div>
                {/* If selected robot steps through here, show its t reservation */}
                {focusedTraverser && (
                  <span style={{ fontSize: '0.55rem', fontFamily: 'var(--font-mono)', color: '#cbd5e1', lineHeight: 1 }}>
                    t={focusedTraverser.t}
                  </span>
                )}
              </div>
            )}

            {/* Robot Marker */}
            {robot && (
              <div
                className={`robot-marker ${robot.status === 'MOVING' ? 'moving' : ''}`}
                style={{
                  backgroundColor: getRobotColor(robot.id).bg,
                  borderColor: selectedRobotId === robot.id ? '#ffffff' : getRobotColor(robot.id).border,
                  borderWidth: selectedRobotId === robot.id ? 2 : 1,
                  borderStyle: 'solid',
                  boxShadow: `0 0 16px ${getRobotColor(robot.id).glow}`,
                  opacity: robot.status === 'FAILED' ? 0.45 : 1,
                  transform: selectedRobotId === robot.id ? 'scale(1.12)' : 'none'
                }}
              >
                {robot.status === 'FAILED' ? (
                  <AlertTriangle size={14} color="#f43f5e" />
                ) : (
                  robot.id
                )}
                {/* Parcel payload badge if carrying cargo */}
                {robot.stage === 'TO_DELIVERY' && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -4,
                      right: -4,
                      width: 10,
                      height: 10,
                      background: '#10b981',
                      borderRadius: '50%',
                      border: '1.5px solid #fff'
                    }}
                    title="Carrying Cargo"
                  />
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
