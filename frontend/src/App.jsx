import React, { useState } from 'react';
import { useSimulationSocket } from './hooks/useSimulationSocket';
import { WarehouseGrid } from './components/WarehouseGrid';
import { TaskManager } from './components/TaskManager';
import { RobotFleet } from './components/RobotFleet';
import { ConflictLog } from './components/ConflictLog';
import { ControlBar } from './components/ControlBar';
import { Box, Radio, Shield, HelpCircle } from 'lucide-react';

export default function App() {
  const {
    state,
    connected,
    actionError,
    addTask,
    addRobot,
    toggleBlockCell,
    resizeGrid,
    toggleRobotFailure,
    togglePause,
    setSpeed,
    resetSimulation
  } = useSimulationSocket();

  const [interactionMode, setInteractionMode] = useState('BLOCK'); // 'BLOCK' | 'ADD_ROBOT'
  const [selectedRobotId, setSelectedRobotId] = useState(null);

  if (!state) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box size={24} color="#fff" />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Connecting to Robonex-2 Simulation Server...</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Waiting for WebSocket telemetry on ws://localhost:5050</p>
      </div>
    );
  }

  const { grid, robots, tasks, events, stats, isRunning, speed } = state;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header className="app-header">
        <div className="brand-badge">
          <div className="brand-icon">
            <Box size={22} color="#fff" />
          </div>
          <div>
            <div className="brand-title">ROBONEX-2</div>
            <div className="brand-sub">Decentralized Multi-Robot Coordination</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#94a3b8' }}>
            <Radio size={14} color={connected ? '#10b981' : '#f43f5e'} />
            <span>P2P Protocol: <strong>Active</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#94a3b8' }}>
            <Shield size={14} color="#6366f1" />
            <span>Deadlock Engine: <strong>Wait-For Cycles + Backtrack</strong></span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-layout">
        {/* Left Column: Controls & Warehouse Visualizer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ControlBar
            isRunning={isRunning}
            speed={speed}
            stats={stats}
            grid={grid}
            connected={connected}
            onTogglePause={togglePause}
            onSetSpeed={setSpeed}
            onResizeGrid={resizeGrid}
            onReset={resetSimulation}
          />

          {/* Grid Canvas Panel */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Interactive Warehouse Floor</h3>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                  Autonomous robots navigate via Time-Aware A* and negotiate reservations in real-time.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.75rem', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, background: '#252e42', border: '1px solid #3b4763', borderRadius: 2 }} />
                  Wall (Click to toggle)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, background: 'rgba(16,185,129,0.3)', border: '1px dashed #10b981', borderRadius: 2 }} />
                  Pickup
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, background: 'rgba(6,182,212,0.3)', border: '1px dashed #06b6d4', borderRadius: 2 }} />
                  Delivery
                </span>
              </div>
            </div>

            <WarehouseGrid
              grid={grid}
              robots={robots}
              tasks={tasks}
              interactionMode={interactionMode}
              selectedRobotId={selectedRobotId}
              onSelectRobot={(rId) => setSelectedRobotId(rId)}
              onCellClick={(x, y) => {
                if (interactionMode === 'ADD_ROBOT') {
                  addRobot({ x, y });
                } else {
                  toggleBlockCell(x, y);
                }
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HelpCircle size={14} color="#6366f1" />
                <span>
                  {interactionMode === 'ADD_ROBOT'
                    ? '🎯 Click any free cell on the floor to deploy an autonomous robot.'
                    : '💡 Click any cell to place a dynamic obstacle. Click a robot to inspect its Space-Time reservations.'}
                </span>
              </div>
              <span style={{ color: interactionMode === 'ADD_ROBOT' ? '#06b6d4' : '#818cf8', fontWeight: 600 }}>
                Mode: {interactionMode === 'ADD_ROBOT' ? 'DEPLOY ROBOT' : 'TOGGLE WALLS'}
              </span>
            </div>
          </div>

          {/* Bottom Telemetry Log on widescreen */}
          <ConflictLog events={events} />
        </div>

        {/* Right Column: Fleet Status & Task Manager */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <TaskManager
            tasks={tasks}
            onAddTask={(pickup, delivery, urgency) => addTask(pickup, delivery, urgency)}
            grid={grid}
            actionError={actionError}
          />

          <RobotFleet
            robots={robots}
            onToggleFail={(rId) => toggleRobotFailure(rId)}
            onAddRobot={(pos, customId) => addRobot(pos, customId)}
            interactionMode={interactionMode}
            setInteractionMode={setInteractionMode}
            selectedRobotId={selectedRobotId}
            onSelectRobot={(rId) => setSelectedRobotId(rId)}
          />
        </div>
      </main>
    </div>
  );
}
