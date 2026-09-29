import React, { useState, useEffect } from 'react';
import { useSimulationSocket } from './hooks/useSimulationSocket';
import { LandingPage } from './components/LandingPage';
import { WarehouseGrid } from './components/WarehouseGrid';
import { TaskManager } from './components/TaskManager';
import { RobotFleet } from './components/RobotFleet';
import { ConflictLog } from './components/ConflictLog';
import { ControlBar } from './components/ControlBar';
import { Box, Radio, Shield, HelpCircle, Sun, Moon, ArrowLeft } from 'lucide-react';

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

  // Navigation View: 'landing' | 'simulator'
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

  // Render Landing Page View
  if (currentView === 'landing') {
    return (
      <LandingPage
        onLaunchSimulator={() => setCurrentView('simulator')}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  // Render Simulator Loading Screen if waiting for backend connection
  if (!state) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--bg-main)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 8, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(15,23,42,0.2)' }}>
          <Box size={24} color="var(--brand-orange)" />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Connecting to Robonex Simulation Server...</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
          Connecting to WebSocket telemetry at {import.meta.env.VITE_WS_URL || 'ws://localhost:5050'}
        </p>
        <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => setCurrentView('landing')}>
          <ArrowLeft size={16} /> Back to Landing Page
        </button>
      </div>
    );
  }

  const { grid, robots, tasks, events, stats, isRunning, speed } = state;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      {/* Top Header Navbar */}
      <header className="app-header">
        <div className="brand-badge" style={{ cursor: 'pointer' }} onClick={() => setCurrentView('landing')} title="Return to Landing Page">
          <div className="brand-icon">
            <Box size={22} color="var(--brand-orange)" />
          </div>
          <div>
            <div className="brand-title">ROBONEX</div>
            <div className="brand-sub">Decentralized Multi-Robot Coordination</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Back to Landing Page button */}
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setCurrentView('landing')}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            <ArrowLeft size={15} />
            <span>Landing Page</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon size={15} color="var(--brand-orange)" /> : <Sun size={15} color="#f59e0b" />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-light)' }}>
            <Radio size={14} color={connected ? 'var(--status-emerald)' : 'var(--status-rose)'} />
            <span>P2P Protocol: <strong style={{ color: 'var(--text-primary)' }}>{connected ? 'Active' : 'Connecting...'}</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-light)' }}>
            <Shield size={14} color="var(--brand-orange)" />
            <span>Deadlock Engine: <strong style={{ color: 'var(--text-primary)' }}>Wait-For Graph + 4-Level Recovery</strong></span>
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
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Warehouse Floor Visualizer</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
                  Autonomous AMRs navigate independently via Space-Time A* and negotiate reservations.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, background: 'var(--wall-bg)', borderRadius: 2 }} />
                  Wall / Obstacle
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
          <ConflictLog events={events} />
        </div>

        {/* Right Column: Task Manager & Fleet Status */}
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
