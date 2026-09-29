import React, { useState, useEffect } from 'react';
import { useSimulationSocket } from './hooks/useSimulationSocket';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { RobotsPage } from './components/RobotsPage';
import { CommunicationPage } from './components/CommunicationPage';
import { WarehouseGrid } from './components/WarehouseGrid';
import { TaskManager } from './components/TaskManager';
import { RobotFleet } from './components/RobotFleet';
import { ConflictLog } from './components/ConflictLog';
import { ControlBar } from './components/ControlBar';
import { Box, HelpCircle } from 'lucide-react';

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

  // Navigation View: 'landing' | 'simulator' | 'robots' | 'communication'
  const [currentView, setCurrentView] = useState('landing');
  const [interactionMode, setInteractionMode] = useState('BLOCK'); // 'BLOCK' | 'ADD_ROBOT'
  const [selectedRobotId, setSelectedRobotId] = useState(null);

  // Theme state: 'light' | 'dark'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('robonex-theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('robonex-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const robotList = state?.robots || [];
  const taskList = state?.tasks || [];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)', paddingTop: 68 }}>
      {/* Floating Unique Navigation Dock */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        theme={theme}
        toggleTheme={toggleTheme}
        robotCount={robotList.length}
        connected={connected}
      />

      {/* 1. Landing Page View */}
      {currentView === 'landing' && (
        <LandingPage
          onLaunchSimulator={() => setCurrentView('simulator')}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {/* 2. Dedicated Fleet Studio View (Robots Page) */}
      {currentView === 'robots' && (
        <RobotsPage
          robots={robotList}
          tasks={taskList}
          onToggleFail={toggleRobotFailure}
          onAddRobot={addRobot}
        />
      )}

      {/* 3. Dedicated Communication & Protocol View */}
      {currentView === 'communication' && (
        <CommunicationPage />
      )}

      {/* 3. Simulator Dashboard View */}
      {currentView === 'simulator' && (
        !state ? (
          <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box size={26} color="var(--brand-orange)" />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Connecting to Telemetry Server...</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
              WebSocket stream: {import.meta.env.VITE_WS_URL || 'ws://localhost:5050'}
            </p>
          </div>
        ) : (
          <main className="main-layout" style={{ marginTop: 20 }}>
            {/* Left Column: Controls & Warehouse Visualizer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <ControlBar
                isRunning={state.isRunning}
                speed={state.speed}
                stats={state.stats}
                grid={state.grid}
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
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Warehouse Floor Visualizer</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
                      Autonomous AMRs navigate independently via Space-Time A* and negotiate reservations.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 12, background: 'var(--wall-bg)', borderRadius: 2 }} />
                      Obstacle Wall
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 12, background: 'var(--status-emerald-bg)', border: '1.5px dashed var(--status-emerald)', borderRadius: 2 }} />
                      Pickup Point
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 12, background: 'var(--status-blue-bg)', border: '1.5px dashed var(--status-blue)', borderRadius: 2 }} />
                      Delivery Point
                    </span>
                  </div>
                </div>

                <WarehouseGrid
                  grid={state.grid}
                  robots={state.robots}
                  tasks={state.tasks}
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

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-light)', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HelpCircle size={15} color="var(--brand-orange)" />
                    <span>
                      {interactionMode === 'ADD_ROBOT'
                        ? 'Click any empty grid cell on the floor to deploy an autonomous AMR.'
                        : 'Click any cell to toggle obstacles. Select a robot to inspect its Space-Time trajectory reservations.'}
                    </span>
                  </div>
                  <span style={{ color: interactionMode === 'ADD_ROBOT' ? 'var(--brand-orange)' : 'var(--text-primary)', fontWeight: 800 }}>
                    Mode: {interactionMode === 'ADD_ROBOT' ? 'DEPLOY ROBOT' : 'TOGGLE WALLS'}
                  </span>
                </div>
              </div>

              {/* Bottom Telemetry Log */}
              <ConflictLog events={state.events} />
            </div>

            {/* Right Column: Task Manager & Fleet Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <TaskManager
                tasks={state.tasks}
                onAddTask={(pickup, delivery, urgency) => addTask(pickup, delivery, urgency)}
                grid={state.grid}
                actionError={actionError}
              />

              <RobotFleet
                robots={state.robots}
                onToggleFail={(rId) => toggleRobotFailure(rId)}
                onAddRobot={(pos, customId) => addRobot(pos, customId)}
                interactionMode={interactionMode}
                setInteractionMode={setInteractionMode}
                selectedRobotId={selectedRobotId}
                onSelectRobot={(rId) => setSelectedRobotId(rId)}
              />
            </div>
          </main>
        )
      )}
    </div>
  );
}
