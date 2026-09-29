import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Wifi, 
  Cpu, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle,
  AlertTriangle, 
  ArrowRight, 
  Code, 
  Copy, 
  Check, 
  Server, 
  Layers, 
  Activity, 
  Share2, 
  Zap, 
  Box, 
  Lock,
  RefreshCw,
  Terminal
} from 'lucide-react';

export function CommunicationPage() {
  const [simStep, setSimStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activePacketType, setActivePacketType] = useState('RESERVATION');
  const [copied, setCopied] = useState(false);

  // Auto step simulation timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimStep(prev => (prev + 1) % 5);
    }, 3500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Sample JSON Communication Payloads
  const jsonPayloads = {
    RESERVATION: {
      protocol: "ROBONEX-P2P/v2.1",
      messageType: "TRAJECTORY_RESERVATION_ANNOUNCE",
      senderId: "AMR_R1",
      receiverId: "BROADCAST_ALL",
      timestamp: 1727581200421,
      sequence: 1482,
      payload: {
        urgency: 8,
        waitTimeTicks: 0,
        effectivePriority: 8.0,
        trajectorySpaceTime: [
          { tick: 0, x: 2, y: 4 },
          { tick: 1, x: 3, y: 4 },
          { tick: 2, x: 4, y: 4 }, // Conflict point
          { tick: 3, x: 5, y: 4 },
          { tick: 4, x: 6, y: 4 }
        ],
        footprintRadiusMeters: 0.85
      },
      signatureHash: "0x8f2a9b4c7d6e1f0a"
    },
    CONFLICT: {
      protocol: "ROBONEX-P2P/v2.1",
      messageType: "CONFLICT_DETECTED_ALERT",
      senderId: "AMR_R2",
      targetPeerId: "AMR_R1",
      timestamp: 1727581200435,
      sequence: 954,
      payload: {
        contestedCell: { x: 4, y: 4 },
        contestedTick: 2,
        myUrgency: 4,
        peerUrgency: 8,
        arbitrationResult: "R2_MUST_YIELD"
      },
      signatureHash: "0x3c7e9a1f2b4d8e6"
    },
    YIELD_ACK: {
      protocol: "ROBONEX-P2P/v2.1",
      messageType: "LOCAL_YIELD_CONFIRMATION",
      senderId: "AMR_R2",
      receiverId: "AMR_R1",
      timestamp: 1727581200448,
      sequence: 955,
      payload: {
        yieldStatus: "YIELDING_ACCEPTED",
        modifiedTrajectory: [
          { tick: 0, x: 4, y: 2 },
          { tick: 1, x: 4, y: 3 },
          { tick: 2, x: 4, y: 3 }, // Pauses 1 tick at (4,3)
          { tick: 3, x: 4, y: 4 }, // Crosses safely at tick 3
          { tick: 4, x: 4, y: 5 }
        ],
        resolvedWaitTimeTicks: 1
      },
      signatureHash: "0x7a2b9c4d1e6f80a"
    },
    WFG_CYCLE: {
      protocol: "ROBONEX-P2P/v2.1",
      messageType: "WAIT_FOR_GRAPH_CYCLE_RECOVERY",
      senderId: "AMR_R2",
      receiverId: "BROADCAST_NEARBY",
      timestamp: 1727581200460,
      sequence: 956,
      payload: {
        wfgCycleDetected: ["AMR_R1", "AMR_R2", "AMR_R3"],
        graduatedRecoveryLevel: 2, // 1: Replan, 2: Backtrack, 3: Urgency Lock
        recoveryAction: "REPLAN_ALTERNATIVE_CORRIDOR",
        newCostHeuristic: 14.2
      },
      signatureHash: "0x1d4e7f9a2b5c80e"
    }
  };

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(jsonPayloads[activePacketType], null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const simulationSteps = [
    {
      title: "Step 1: Local Space-Time Path Computation",
      desc: "Each AMR independently computes its optimal path (x, y, t) using its onboard Space-Time A* algorithm. No central server is consulted.",
      activeNode: "R1_COMPUTE",
      statusText: "Robot R1 & R2 calculate local trajectories."
    },
    {
      title: "Step 2: P2P Reservation Broadcast",
      desc: "AMRs broadcast their 4D trajectory reservation packets over local 5.8 GHz Mesh Radio & UWB transceivers to all proximal peers.",
      activeNode: "BROADCAST",
      statusText: "Packet: TRAJECTORY_RESERVATION_ANNOUNCE transmitted."
    },
    {
      title: "Step 3: Peer Conflict Detection at (4,4, t=2)",
      desc: "AMR_R2 receives R1's packet. Its onboard receiver compares trajectory grids and detects a space-time overlap at grid cell (4,4) at tick t=2.",
      activeNode: "CONFLICT_CHECK",
      statusText: "Conflict Detected! Overlap at cell (4,4) at t=2."
    },
    {
      title: "Step 4: Deterministic Priority Arbitration",
      desc: "Robots evaluate Priority = Urgency + (Wait Time × 0.5). R1 (Urgency 8) outranks R2 (Urgency 4). R2 yields automatically.",
      activeNode: "ARBITRATION",
      statusText: "Arbitration Result: R1 Priority 8.0 > R2 Priority 4.0. R2 Yields."
    },
    {
      title: "Step 5: Conflict Resolution & Safe Passage",
      desc: "R2 inserts a 1-tick pause into its local Space-Time grid. R1 passes through (4,4) safely at tick 2; R2 crosses at tick 3. 0 Deadlocks!",
      activeNode: "RESOLVED",
      statusText: "Resolution Complete. 0 Collisions, 0 Central Server Latency."
    }
  ];

  return (
    <div style={{ padding: '30px 40px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Page Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--brand-orange-light)', border: '1px solid var(--brand-orange)', borderRadius: 20, padding: '4px 14px', fontSize: '0.78rem', color: 'var(--brand-orange)', fontWeight: 800, marginBottom: 10 }}>
            <Radio size={14} />
            Peer-to-Peer Machine-to-Machine (M2M) Communication Architecture
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Decentralized Communication Layer & Protocol
          </h1>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: 4 }}>
            Explore how autonomous AMRs negotiate space-time trajectories directly via P2P mesh packets without any central dispatcher server.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'var(--status-emerald-bg)', border: '1px solid var(--status-emerald)', borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--status-emerald)', fontWeight: 800 }}>
            <Wifi size={16} />
            P2P Mesh: &lt; 3ms Latency
          </div>
        </div>
      </div>

      {/* SECTION 1: ARCHITECTURE COMPARISON (Centralized Server vs Robonex P2P Mesh) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Legacy Centralized Architecture */}
        <div className="glass-panel" style={{ padding: 24, border: '1px solid var(--status-rose)', background: 'var(--status-rose-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--status-rose)', fontWeight: 800, fontSize: '1.05rem', marginBottom: 16 }}>
            <Server size={22} />
            <span>Legacy Centralized AGV Server (Single Point of Failure)</span>
          </div>

          {/* Centralized Diagram */}
          <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 24, textAlign: 'center', position: 'relative', marginBottom: 16 }}>
            <div style={{ width: 70, height: 70, borderRadius: 14, background: '#ef4444', color: '#fff', margin: '0 auto 16px auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)' }}>
              <Server size={28} />
              <span style={{ fontSize: '0.65rem', fontWeight: 900, marginTop: 2 }}>CENTRAL</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--status-rose)', fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <AlertTriangle size={14} color="var(--status-rose)" />
              <span>Central Bottleneck: Computes O(N!) paths simultaneously</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <div style={{ padding: '8px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: '0.78rem', fontWeight: 800 }}>
                Robot R1
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>Wi-Fi Latency Delay</span>
                <ArrowRight size={12} color="var(--text-muted)" />
              </div>
              <div style={{ padding: '8px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: '0.78rem', fontWeight: 800 }}>
                Robot R2
              </div>
            </div>
          </div>

          <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, listStyle: 'none' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <XCircle size={16} style={{ color: 'var(--status-rose)', flexShrink: 0, marginTop: 2 }} />
              <span><strong>Server Latency:</strong> Wi-Fi latency or cloud dropouts stall all robots in the facility.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <XCircle size={16} style={{ color: 'var(--status-rose)', flexShrink: 0, marginTop: 2 }} />
              <span><strong>Exponential Scaling:</strong> As fleet grows to 50+ AMRs, central server path computation explodes.</span>
            </li>
          </ul>
        </div>

        {/* Robonex P2P Mesh Architecture */}
        <div className="glass-panel" style={{ padding: 24, border: '1px solid var(--status-emerald)', background: 'var(--status-emerald-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--status-emerald)', fontWeight: 800, fontSize: '1.05rem', marginBottom: 16 }}>
            <Share2 size={22} />
            <span>Robonex Decentralized P2P Mesh (Direct M2M Protocol)</span>
          </div>

          {/* P2P Mesh Diagram */}
          <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 24, position: 'relative', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Robot 1 Node */}
              <div style={{ padding: 14, background: 'var(--bg-card)', border: '2px solid var(--brand-orange)', borderRadius: 10, textAlign: 'center', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.2)' }}>
                <div style={{ fontWeight: 900, color: 'var(--brand-orange)', fontSize: '0.9rem' }}>AMR Unit #R1</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>Space-Time Engine</div>
              </div>

              {/* Dynamic Animated P2P Packet Wave */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, padding: '0 16px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--status-emerald)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Wifi size={14} className="pulse-icon" />
                  Direct Radio Mesh (&lt; 3ms)
                </div>
                <div style={{ width: '100%', height: 3, background: 'linear-gradient(90deg, var(--brand-orange), var(--status-emerald))', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', width: 40, height: '100%', background: '#ffffff', boxShadow: '0 0 8px #ffffff', animation: 'p2pWave 1.5s infinite linear' }} />
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  JSON Packet Payload
                </div>
              </div>

              {/* Robot 2 Node */}
              <div style={{ padding: 14, background: 'var(--bg-card)', border: '2px solid var(--status-emerald)', borderRadius: 10, textAlign: 'center', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
                <div style={{ fontWeight: 900, color: 'var(--status-emerald)', fontSize: '0.9rem' }}>AMR Unit #R2</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>Space-Time Engine</div>
              </div>
            </div>
          </div>

          <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, listStyle: 'none' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} style={{ color: 'var(--status-emerald)', flexShrink: 0, marginTop: 2 }} />
              <span><strong>Zero Server Overhead:</strong> Robots calculate paths locally and broadcast trajectories peer-to-peer.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} style={{ color: 'var(--status-emerald)', flexShrink: 0, marginTop: 2 }} />
              <span><strong>Wi-Fi Immunity:</strong> Direct UWB/RF radio mesh keeps robots moving even during facility Wi-Fi outages.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* SECTION 2: INTERACTIVE STEP-BY-STEP P2P FLOW SIMULATION */}
      <div className="glass-panel" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={20} color="var(--brand-orange)" />
              Interactive Coordinated Intersection Protocol Simulation
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
              Observe step-by-step how Robot R1 and R2 detect a trajectory conflict and negotiate a yield using P2P JSON packets.
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsPlaying(!isPlaying)}
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              {isPlaying ? <Pause size={15} color="var(--brand-orange)" /> : <Play size={15} color="#10b981" />}
              <span>{isPlaying ? 'Pause Auto-Play' : 'Play Flow'}</span>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setSimStep((simStep + 1) % 5)}
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              <span>Next Step</span>
              <ChevronRight size={15} />
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setSimStep(0)}
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
              title="Reset Simulation to Step 1"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Timeline Stepper */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {simulationSteps.map((st, idx) => (
            <div
              key={idx}
              onClick={() => {
                setSimStep(idx);
                setIsPlaying(false);
              }}
              style={{
                padding: '12px 14px',
                background: simStep === idx ? 'var(--brand-orange-light)' : 'var(--bg-subtle)',
                border: `1px solid ${simStep === idx ? 'var(--brand-orange)' : 'var(--border-light)'}`,
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: simStep === idx ? 'var(--brand-orange)' : 'var(--text-muted)' }}>
                PHASE 0{idx + 1}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2, lineHeight: 1.3 }}>
                {st.title.split(':')[1]}
              </div>
            </div>
          ))}
        </div>

        {/* Current Active Step Deep-Dive Box */}
        <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 24, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-orange)', background: 'var(--brand-orange-light)', padding: '2px 8px', borderRadius: 4, marginBottom: 8 }}>
              Active Step {simStep + 1} of 5
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
              {simulationSteps[simStep].title}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 500 }}>
              {simulationSteps[simStep].desc}
            </p>

            <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} color="var(--brand-orange)" />
              <span>{simulationSteps[simStep].statusText}</span>
            </div>
          </div>

          {/* Internal Hardware Module Routing Diagram */}
          <div className="glass-panel" style={{ padding: 18, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h4 style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Cpu size={14} color="var(--brand-orange)" />
              Internal AMR Signal Routing Path
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.75rem', fontWeight: 700 }}>
              <div style={{ padding: '8px 12px', background: simStep >= 1 ? 'var(--status-emerald-bg)' : 'var(--bg-subtle)', border: `1px solid ${simStep >= 1 ? 'var(--status-emerald)' : 'var(--border-light)'}`, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>1. Radio/UWB Antenna Transceiver</span>
                <Wifi size={14} color={simStep >= 1 ? 'var(--status-emerald)' : 'var(--text-muted)'} />
              </div>

              <div style={{ padding: '8px 12px', background: simStep >= 2 ? 'var(--brand-orange-light)' : 'var(--bg-subtle)', border: `1px solid ${simStep >= 2 ? 'var(--brand-orange)' : 'var(--border-light)'}`, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>2. Onboard ECU / Trajectory Buffer</span>
                <Cpu size={14} color={simStep >= 2 ? 'var(--brand-orange)' : 'var(--text-muted)'} />
              </div>

              <div style={{ padding: '8px 12px', background: simStep >= 3 ? 'var(--status-blue-bg)' : 'var(--bg-subtle)', border: `1px solid ${simStep >= 3 ? 'var(--status-blue)' : 'var(--border-light)'}`, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>3. Space-Time A* Priority Evaluator</span>
                <Zap size={14} color={simStep >= 3 ? 'var(--status-blue)' : 'var(--text-muted)'} />
              </div>

              <div style={{ padding: '8px 12px', background: simStep >= 4 ? 'var(--status-emerald-bg)' : 'var(--bg-subtle)', border: `1px solid ${simStep >= 4 ? 'var(--status-emerald)' : 'var(--border-light)'}`, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>4. BLDC Drive Motor Controller (Yield / Proceed)</span>
                <CheckCircle2 size={14} color={simStep >= 4 ? 'var(--status-emerald)' : 'var(--text-muted)'} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: REAL-TIME JSON COMMUNICATION PAYLOAD INSPECTOR */}
      <div className="glass-panel" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Code size={18} color="var(--brand-orange)" />
              Real-Time P2P Message Payload Inspector (JSON Schema)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
              Inspect the exact data packet payloads exchanged between autonomous mobile robots over the P2P mesh network.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-outline"
            onClick={handleCopyJson}
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            {copied ? <Check size={15} color="var(--status-emerald)" /> : <Copy size={15} />}
            <span>{copied ? 'Copied JSON!' : 'Copy JSON Payload'}</span>
          </button>
        </div>

        {/* Message Type Selector Tabs */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { id: 'RESERVATION', label: '1. Trajectory Reservation', icon: Share2 },
            { id: 'CONFLICT', label: '2. Conflict Detection Alert', icon: AlertTriangle },
            { id: 'YIELD_ACK', label: '3. Local Yield Confirmation', icon: CheckCircle2 },
            { id: 'WFG_CYCLE', label: '4. Deadlock Recovery (WFG)', icon: ShieldCheck }
          ].map((pkt) => {
            const IconComp = pkt.icon;
            return (
              <button
                key={pkt.id}
                type="button"
                className={`btn ${activePacketType === pkt.id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActivePacketType(pkt.id)}
                style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <IconComp size={15} />
                <span>{pkt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Code Viewer Panel */}
        <div style={{ position: 'relative', background: '#09090b', border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ background: '#18181b', padding: '8px 16px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
            <span>Schema: {jsonPayloads[activePacketType].messageType}.json</span>
            <span>Encoding: UTF-8 JSON • Hash Verified</span>
          </div>

          <pre 
            style={{ 
              padding: 20, 
              margin: 0, 
              fontSize: '0.84rem', 
              fontFamily: 'var(--font-mono)', 
              color: '#38bdf8', 
              maxHeight: 380, 
              overflowY: 'auto',
              lineHeight: 1.5
            }}
          >
            {JSON.stringify(jsonPayloads[activePacketType], null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
