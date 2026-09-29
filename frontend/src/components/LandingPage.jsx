import React, { useState } from 'react';
import { 
  Box, 
  Play, 
  Radio, 
  Shield, 
  Cpu, 
  Zap, 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  AlertTriangle, 
  Sun, 
  Moon, 
  ArrowRight, 
  Terminal, 
  Activity, 
  Truck, 
  Lock, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';

export function LandingPage({ onLaunchSimulator, theme, toggleTheme }) {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqs = [
    {
      q: "How does Robonex achieve coordination without a central server?",
      a: "Robonex gives each autonomous mobile robot (AMR) its own Space-Time A* path planning engine. Robots broadcast their planned spatial trajectories over a Peer-to-Peer (P2P) event bus. When two trajectories overlap at the same space-time tick (x, y, t), robots dynamically resolve the conflict using deterministic priority arbitration and local yielding."
    },
    {
      q: "What is Space-Time A* planning?",
      a: "Standard A* plans a path in 2D space (x, y). Space-Time A* expands the state space to 3D: (x, y, t). This allows robots to reserve a cell for a specific clock tick. Two robots can safely use the exact same narrow aisle if they pass through it at different time ticks."
    },
    {
      q: "How does the system resolve deadlocks when robots block each other in narrow aisles?",
      a: "Robonex uses a Wait-For Graph (WFG) that continuously monitors dependency cycles (e.g. Robot A waiting on Robot B waiting on Robot A). When a cycle is detected, a 4-level graduated recovery engine executes: 1) Replan around contested cell, 2) Backtrack along history, 3) Grant temporary urgency priority lock, or 4) Reassign task back to the pending queue."
    },
    {
      q: "Why does simulation state persist when refreshing the browser?",
      a: "The true simulation state lives in-memory inside the Node.js observer process. When you reload the browser, the React frontend reconnects to the WebSocket telemetry stream and receives the live snapshot immediately without resetting."
    },
    {
      q: "Can the central server fail or crash?",
      a: "The central Node.js server acts purely as an observer and telemetry broadcaster for the operator UI. Robots execute path calculation and P2P reservation negotiation locally in their independent agent event loops. If the observer server disconnects, robots continue navigating safely."
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', transition: 'background-color 0.2s ease, color 0.2s ease' }}>
      
      {/* Top Header Navbar */}
      <header className="app-header">
        <div className="brand-badge" style={{ cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="brand-icon">
            <Box size={22} color="var(--brand-orange)" />
          </div>
          <div>
            <div className="brand-title">ROBONEX</div>
            <div className="brand-sub">Decentralized Multi-Robot Coordination</div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: '0.85rem', fontWeight: 700 }}>
          <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => scrollToSection('features')}>Features</span>
          <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => scrollToSection('decentralization')}>Decentralization</span>
          <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => scrollToSection('architecture')}>Architecture</span>
          <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => scrollToSection('faq')}>FAQ</span>
        </nav>

        {/* Theme Toggle & Dashboard CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon size={15} color="var(--brand-orange)" /> : <Sun size={15} color="#f59e0b" />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onLaunchSimulator}
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            <Play size={16} />
            <span>Go to Dashboard</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '60px 28px 40px 28px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
          <div>
            {/* Tag Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20, background: 'var(--brand-orange-light)', border: '1px solid var(--brand-orange)', color: 'var(--brand-orange)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>
              <Radio size={14} color="var(--brand-orange)" />
              <span>Decentralized Edge AMR Architecture</span>
            </div>

            <h1 style={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: 1.15, color: 'var(--text-primary)', marginBottom: 20, letterSpacing: '-0.03em' }}>
              Autonomous Multi-Robot Fleet Navigation <span style={{ color: 'var(--brand-orange)' }}>Without Central Bottlenecks</span>
            </h1>

            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 500, marginBottom: 32 }}>
              Robonex enables fleets of Autonomous Mobile Robots (AMRs) to independently plan 3D Space-Time routes, negotiate cell reservations over P2P mesh, and resolve narrow aisle deadlocks using Wait-For Graphs.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onLaunchSimulator}
                style={{ padding: '14px 28px', fontSize: '1rem' }}
              >
                <Play size={18} />
                <span>Go to Live Dashboard</span>
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => scrollToSection('decentralization')}
                style={{ padding: '14px 24px', fontSize: '0.95rem' }}
              >
                <span>How P2P Works</span>
              </button>
            </div>
          </div>

          {/* Hero Visual Image */}
          <div style={{ position: 'relative' }}>
            <div className="glass-panel" style={{ padding: 8, overflow: 'hidden', borderRadius: 14 }}>
              <img
                src="/hero_amr_warehouse.jpg"
                alt="Decentralized AMR Warehouse Fleet"
                style={{ width: '100%', height: 'auto', borderRadius: 10, display: 'block', border: '1px solid var(--border-light)' }}
              />
            </div>

            {/* Floating Telemetry Badges */}
            <div style={{ position: 'absolute', bottom: -16, left: 20, background: 'var(--bg-card)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Zap size={18} color="var(--brand-orange)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>Sub-Millisecond</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Local P2P Negotiation</div>
              </div>
            </div>

            <div style={{ position: 'absolute', top: -16, right: 20, background: 'var(--bg-card)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={18} color="var(--status-emerald)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>100% Zero Single Point</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Of System Failure</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Counter Bar */}
      <section style={{ background: 'var(--bg-subtle)', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', padding: '24px 28px', marginTop: 40 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--brand-orange)' }}>100% Edge</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Autonomous Path Calculation</div>
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>(x, y, t)</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Space-Time A* State Space</div>
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--status-emerald)' }}>4-Level</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Wait-For Deadlock Engine</div>
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--status-blue)' }}>P2P Mesh</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Reservation Arbitration</div>
          </div>
        </div>
      </section>

      {/* Comparison: Centralized vs Robonex P2P */}
      <section id="decentralization" style={{ padding: '70px 28px', maxWidth: 1300, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
            Centralized Server Bottlenecks vs. <span style={{ color: 'var(--brand-orange)' }}>Robonex P2P</span>
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: 700, margin: '0 auto', fontWeight: 600 }}>
            Discover why modern automated warehouse operations are moving away from traditional single-server dispatchers.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
          {/* Centralized Card */}
          <div className="glass-panel" style={{ padding: 30, borderColor: 'var(--status-rose)', background: 'var(--status-rose-bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--status-rose)', fontWeight: 800, fontSize: '1.1rem', marginBottom: 16 }}>
              <AlertTriangle size={22} />
              <span>Traditional Central Server (Legacy)</span>
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, listStyle: 'none' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <XCircle size={18} style={{ color: 'var(--status-rose)', flexShrink: 0, marginTop: 2 }} />
                <span><strong>Single Point of Failure:</strong> If the central server experiences network latency or crashes, every robot in the warehouse stalls.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <XCircle size={18} style={{ color: 'var(--status-rose)', flexShrink: 0, marginTop: 2 }} />
                <span><strong>Combinatorial Complexity:</strong> Central planner must compute paths for N robots simultaneously, scaling exponentially.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <XCircle size={18} style={{ color: 'var(--status-rose)', flexShrink: 0, marginTop: 2 }} />
                <span><strong>Wi-Fi Dead Zone Vulnerability:</strong> Robots lose movement capability when passing through warehouse Wi-Fi shadow areas.</span>
              </li>
            </ul>
          </div>

          {/* Robonex P2P Card */}
          <div className="glass-panel" style={{ padding: 30, borderColor: 'var(--status-emerald)', background: 'var(--status-emerald-bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--status-emerald)', fontWeight: 800, fontSize: '1.1rem', marginBottom: 16 }}>
              <CheckCircle2 size={22} />
              <span>Robonex Decentralized P2P (Modern)</span>
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, listStyle: 'none' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <CheckCircle2 size={18} style={{ color: 'var(--status-emerald)', flexShrink: 0, marginTop: 2 }} />
                <span><strong>100% Autonomous Decision Making:</strong> Each robot calculates its own route using local Space-Time A* state engines.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <CheckCircle2 size={18} style={{ color: 'var(--status-emerald)', flexShrink: 0, marginTop: 2 }} />
                <span><strong>Direct P2P Peer Communication:</strong> Robots broadcast location and reservations directly to neighboring peers over P2P mesh.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <CheckCircle2 size={18} style={{ color: 'var(--status-emerald)', flexShrink: 0, marginTop: 2 }} />
                <span><strong>Continuous Local Deadlock Recovery:</strong> Wait-For Graph engines detect dependency cycles and resolve choke points automatically.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* P2P Communication & Coordination Showcase */}
      <section id="features" style={{ background: 'var(--bg-subtle)', padding: '70px 28px', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
            <div className="glass-panel" style={{ padding: 8, borderRadius: 14 }}>
              <img
                src="/p2p_robot_mesh.jpg"
                alt="P2P Mesh Communication"
                style={{ width: '100%', height: 'auto', borderRadius: 10, display: 'block', border: '1px solid var(--border-light)' }}
              />
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-orange)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Local Peer Negotiation Protocol
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
                How Direct P2P Communication Works
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 500, marginBottom: 24 }}>
                When two AMRs approach an intersection or narrow aisle, they don't ask a server for permission. Instead, they exchange trajectory reservations directly over P2P mesh.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--brand-black)', color: 'var(--text-inverted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>1</div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>3D Trajectory Planning</h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Robot computes candidate waypoints (x, y, t) from current position to pickup and destination.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--brand-orange)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>2</div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>P2P Reservation Broadcasting</h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Broadcasts time-stamped cell requests `(x, y) @ t` to neighboring robots on the event mesh.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--status-emerald)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>3</div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Starvation-Free Priority Arbitration</h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Dynamic formula: <strong>Priority = Urgency + (Wait Time × 0.5)</strong> breaks ties fairly and prevents starvation.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Architecture Cards */}
      <section id="architecture" style={{ padding: '70px 28px', maxWidth: 1300, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
            Engineering Architecture & Algorithms
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: 700, margin: '0 auto', fontWeight: 600 }}>
            Built on mathematically verified path planning, space-time reservation locking, and graph cycle detection.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {/* Card 1 */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Cpu size={22} color="var(--brand-orange)" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Space-Time A* Search</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, fontWeight: 500 }}>
              Searches 3D space (x, y, t) with orthogonal moves and time-step `WAIT` penalties. Prevents head-on cell swap conflicts.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Lock size={22} color="var(--status-blue)" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Reservation Table</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, fontWeight: 500 }}>
              Registers time-locked coordinates `(x, y) @ t`. Deterministic ID tie-breaking eliminates deadlock race conditions.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <RefreshCw size={22} color="var(--status-emerald)" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Wait-For Graph (WFG)</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, fontWeight: 500 }}>
              DFS cycle detector triggers a 4-level graduated recovery: 1) Replan, 2) Backtrack, 3) Priority Lock, 4) Task Reassign.
            </p>
          </div>
        </div>
      </section>

      {/* Space-Time Grid Showcase */}
      <section style={{ background: 'var(--bg-subtle)', padding: '70px 28px', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-orange)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Interactive Visual Floor
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
              Real-Time Space-Time Trajectory Inspection
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 500, marginBottom: 20 }}>
              Operators can dynamically place wall obstacles, dispatch tasks with priority levels, spawn new robots, or simulate mechanical failures. Moving robots automatically recalculate shortcuts when walls unblock!
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={onLaunchSimulator}
              style={{ padding: '12px 24px', fontSize: '0.9rem' }}
            >
              <Play size={16} />
              <span>Go to Dashboard</span>
            </button>
          </div>

          <div className="glass-panel" style={{ padding: 8, borderRadius: 14 }}>
            <img
              src="/space_time_grid_warehouse.jpg"
              alt="Space-Time Grid Overlay"
              style={{ width: '100%', height: 'auto', borderRadius: 10, display: 'block', border: '1px solid var(--border-light)' }}
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" style={{ padding: '70px 28px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
            Frequently Asked Questions
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Everything you need to know about Robonex decentralized multi-robot navigation.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqs.map((faq, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '16px 20px' }}>
              <div
                onClick={() => toggleFaq(idx)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}
              >
                <span>{faq.q}</span>
                {openFaq === idx ? <ChevronUp size={18} color="var(--brand-orange)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
              </div>
              {openFaq === idx && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 500 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section style={{ background: '#09090b', color: '#ffffff', padding: '60px 28px', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: 16 }}>Ready to Experience Decentralized AMR Navigation?</h2>
          <p style={{ fontSize: '1rem', color: '#e4e4e7', marginBottom: 28, fontWeight: 500 }}>
            Launch the interactive simulator dashboard to deploy robots, assign tasks, place obstacles, and inspect real-time Space-Time reservations.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onLaunchSimulator}
            style={{ padding: '14px 32px', fontSize: '1rem' }}
          >
            <Play size={18} />
            <span>Go to Live Dashboard</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-light)', padding: '24px 28px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>ROBONEX</strong> — Decentralized AMR Multi-Robot Coordination Framework
          </div>
          <div>
            React • Node.js • Express • Space-Time A* • WebSockets
          </div>
        </div>
      </footer>

    </div>
  );
}
