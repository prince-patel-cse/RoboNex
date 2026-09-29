import React, { useState } from 'react';
import { 
  Bot, 
  Battery, 
  Plus, 
  Power, 
  AlertTriangle, 
  Box, 
  Activity, 
  Search, 
  Filter, 
  Zap, 
  Shield, 
  Maximize2, 
  Rotate3D, 
  CheckCircle2, 
  Wifi, 
  Cpu, 
  Thermometer, 
  Clock 
} from 'lucide-react';
import { Robot3DViewer } from './Robot3DViewer';
import { getRobotColor } from './WarehouseGrid';

export function RobotsPage({ robots = [], tasks = [], onToggleFail, onAddRobot }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRobotFor3D, setSelectedRobotFor3D] = useState(null);

  // Statistics
  const totalRobots = robots.length;
  const movingCount = robots.filter(r => r.status === 'MOVING').length;
  const idleCount = robots.filter(r => r.status === 'IDLE').length;
  const waitingCount = robots.filter(r => r.status === 'WAITING').length;
  const failedCount = robots.filter(r => r.status === 'FAILED').length;
  const avgBattery = Math.round(robots.reduce((acc, r) => acc + (r.battery || 0), 0) / (totalRobots || 1));

  // Filtered robots
  const filteredRobots = robots.filter(r => {
    const matchesSearch = r.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '30px 40px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Top Header & Overview */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--brand-orange-light)', border: '1px solid var(--brand-orange)', borderRadius: 20, padding: '4px 14px', fontSize: '0.78rem', color: 'var(--brand-orange)', fontWeight: 800, marginBottom: 10 }}>
            <Bot size={14} />
            Fleet Management & Hardware Telemetry Studio
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Autonomous Mobile Robots (AMR) Fleet
          </h1>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: 4 }}>
            Click on any robot card to inspect its real-time 3D CAD structure, motor health diagnostics, and Space-Time trajectory.
          </p>
        </div>

        {/* Action Button to Spawn New AMR */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const randX = Math.floor(Math.random() * 10);
            const randY = Math.floor(Math.random() * 10);
            onAddRobot({ x: randX, y: randY });
          }}
          style={{ padding: '10px 20px', fontSize: '0.88rem' }}
        >
          <Plus size={16} />
          <span>Deploy New AMR Unit</span>
        </button>
      </div>

      {/* Industrial Key Fleet Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        <div className="glass-panel" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Total AMR Fleet</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            {totalRobots} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Units</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Active Missions</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--status-blue)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            {movingCount} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Moving</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Idle Ready</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--status-emerald)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            {idleCount} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Available</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Waiting / Cycle</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--brand-orange)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            {waitingCount} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Negotiating</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Avg Battery Charge</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: avgBattery > 50 ? 'var(--status-emerald)' : 'var(--status-rose)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            {avgBattery}%
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="glass-panel" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 400 }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Filter by Robot ID (e.g. R1, R2)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.88rem', fontWeight: 600 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Filter size={16} color="var(--brand-orange)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Status:</span>
          {['ALL', 'MOVING', 'IDLE', 'WAITING', 'FAILED'].map((st) => (
            <button
              key={st}
              type="button"
              className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter(st)}
              style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: 20 }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Robot Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {filteredRobots.length === 0 ? (
          <div className="glass-panel" style={{ padding: 40, textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text-muted)' }}>
            <h3>No AMR units found matching your criteria.</h3>
          </div>
        ) : (
          filteredRobots.map((robot) => {
            const isFailed = robot.status === 'FAILED';
            const themeColor = getRobotColor(robot.id);

            return (
              <div
                key={robot.id}
                className="glass-panel"
                style={{
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  transition: 'all 0.2s ease',
                  border: isFailed ? '1px solid var(--status-rose)' : '1px solid var(--border-light)'
                }}
              >
                {/* Robot Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: themeColor.bg,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1.1rem',
                        fontFamily: 'var(--font-mono)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                    >
                      {robot.id}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                          AMR #{robot.id}
                        </h3>
                        <span className={`badge-status ${
                          robot.status === 'MOVING' ? 'badge-moving' :
                          robot.status === 'WAITING' ? 'badge-waiting' :
                          robot.status === 'FAILED' ? 'badge-blocked' :
                          'badge-idle'
                        }`}>
                          {robot.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        Position: ({robot.position.x}, {robot.position.y})
                      </p>
                    </div>
                  </div>

                  {/* Kill / Revive button */}
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => onToggleFail(robot.id)}
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    title={isFailed ? 'Restore robot hardware' : 'Simulate hardware failure'}
                  >
                    <Power size={13} />
                    <span>{isFailed ? 'Revive' : 'Kill'}</span>
                  </button>
                </div>

                {/* Battery & Hardware Indicators */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--bg-subtle)', padding: 12, borderRadius: 8, border: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Battery size={13} color={robot.battery > 50 ? 'var(--status-emerald)' : 'var(--status-rose)'} />
                      Battery Level
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: 2 }}>
                      {robot.battery}%
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Box size={13} color="var(--brand-orange)" />
                      Task Assignment
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: robot.taskId ? 'var(--brand-orange)' : 'var(--text-muted)', marginTop: 2 }}>
                      {robot.taskId || 'Idle (None)'}
                    </div>
                  </div>
                </div>

                {/* Diagnostic Pills */}
                <div style={{ display: 'flex', gap: 8, fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-subtle)', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-light)' }}>
                    <Wifi size={12} color="var(--status-emerald)" />
                    P2P Mesh
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-subtle)', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-light)' }}>
                    <Shield size={12} color="var(--brand-orange)" />
                    LiDAR 360°
                  </span>
                </div>

                {/* 3D Inspect CTA Button */}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setSelectedRobotFor3D(robot)}
                  style={{ width: '100%', padding: '10px', fontSize: '0.85rem', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Rotate3D size={16} />
                  <span>Inspect 3D Robot Model</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 3D AMR Modal Viewer if selected */}
      {selectedRobotFor3D && (
        <Robot3DViewer
          robot={selectedRobotFor3D}
          onClose={() => setSelectedRobotFor3D(null)}
        />
      )}
    </div>
  );
}
