import React from 'react';
import { Package, MapPin, AlertTriangle } from 'lucide-react';

const PRESET_COLORS = {
  R1: { bg: '#c2410c', border: '#9a3412' }, // Dark Industrial Orange
  R2: { bg: '#0f172a', border: '#1e293b' }, // Classic Dark Slate
  R3: { bg: '#047857', border: '#065f46' }, // Emerald Green
  R4: { bg: '#1d4ed8', border: '#1e40af' }  // Royal Blue
};

export function getRobotColor(robotId) {
  if (PRESET_COLORS[robotId]) return PRESET_COLORS[robotId];
  // Deterministic HSL generator for dynamic robots (R5, R6...)
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
  const pathSteps = new Map();
  robots.forEach(r => {
    if (r.path && r.path.length > 0) {
      r.path.forEach((step) => {
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
                          opacity: step.isFocus ? 0.95 : 0.25
                        }}
                      />
                    );
                  })}
                </div>
                {/* If selected robot steps through here, show its reservation tick t */}
                {focusedTraverser && (
                  <span style={{ fontSize: '0.55rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 800, lineHeight: 1 }}>
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
                  borderColor: selectedRobotId === robot.id ? 'var(--brand-orange)' : getRobotColor(robot.id).border,
                  borderWidth: selectedRobotId === robot.id ? 3 : 1,
                  borderStyle: 'solid',
                  boxShadow: selectedRobotId === robot.id ? '0 0 0 3px rgba(194, 65, 12, 0.4)' : '0 2px 5px rgba(0,0,0,0.25)',
                  opacity: robot.status === 'FAILED' ? 0.5 : 1,
                  transform: selectedRobotId === robot.id ? 'scale(1.12)' : 'none'
                }}
              >
                {robot.status === 'FAILED' ? (
                  <AlertTriangle size={14} color="#ffffff" />
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
