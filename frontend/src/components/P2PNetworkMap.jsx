import React, { useRef, useEffect } from 'react';
import { Radio } from 'lucide-react';
import { getRobotColor } from './WarehouseGrid';

/**
 * P2PNetworkMap — visualizes the peer-to-peer mesh between robots.
 * Shows nodes (one per robot) connected by lines, colored by robot identity.
 * Nodes pulse when the robot is MOVING (active communication).
 */
export function P2PNetworkMap({ robots = [], connected = true }) {
  const canvasRef = useRef(null);

  const activeRobots = robots.filter(r => r.status !== 'FAILED');
  const totalRobots = robots.length;
  const onlineCount = activeRobots.length;

  const networkStatus = !connected
    ? { label: 'OFFLINE', color: 'var(--status-rose)' }
    : onlineCount < totalRobots
    ? { label: 'DEGRADED', color: 'var(--status-amber)' }
    : { label: 'STABLE', color: 'var(--status-emerald)' };

  // Canvas-based network drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || robots.length === 0) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) * 0.32;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    let animFrame;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Node positions arranged in a circle
      const n = robots.length;
      const positions = robots.map((_, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        return {
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle)
        };
      });

      // Draw connection lines (mesh = all-to-all)
      for (let i = 0; i < robots.length; i++) {
        for (let j = i + 1; j < robots.length; j++) {
          const rA = robots[i];
          const rB = robots[j];
          const bothOnline = rA.status !== 'FAILED' && rB.status !== 'FAILED';
          const pA = positions[i];
          const pB = positions[j];

          ctx.beginPath();
          ctx.moveTo(pA.x, pA.y);
          ctx.lineTo(pB.x, pB.y);
          ctx.strokeStyle = bothOnline
            ? (isDark ? 'rgba(194,65,12,0.35)' : 'rgba(194,65,12,0.25)')
            : (isDark ? 'rgba(100,100,100,0.2)' : 'rgba(150,150,150,0.15)');
          ctx.lineWidth = bothOnline ? 1.5 : 0.8;
          ctx.setLineDash(bothOnline ? [] : [4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Animate a tiny "packet" traveling along active lines
          if (bothOnline && (rA.status === 'MOVING' || rB.status === 'MOVING')) {
            const t = (Date.now() % 1400) / 1400;
            const px = pA.x + (pB.x - pA.x) * t;
            const py = pA.y + (pB.y - pA.y) * t;
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(194,65,12,0.85)';
            ctx.fill();
          }
        }
      }

      // Draw nodes
      robots.forEach((robot, i) => {
        const pos = positions[i];
        const color = getRobotColor(robot.id);
        const isOnline = robot.status !== 'FAILED';
        const isMoving = robot.status === 'MOVING';

        // Glow ring for moving robots
        if (isMoving && isOnline) {
          const pulseR = 12 + 3 * Math.sin(Date.now() / 300);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pulseR, 0, Math.PI * 2);
          ctx.fillStyle = `${color.bg}22`;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = isOnline ? color.bg : (isDark ? '#3f3f46' : '#cbd5e1');
        ctx.fill();
        ctx.strokeStyle = isOnline ? color.border : (isDark ? '#52525b' : '#94a3b8');
        ctx.lineWidth = 2;
        ctx.stroke();

        // Robot ID text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(robot.id, pos.x, pos.y);

        // Label below node
        ctx.fillStyle = isDark ? 'rgba(228,228,231,0.75)' : 'rgba(51,65,85,0.75)';
        ctx.font = '7px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(robot.status, pos.x, pos.y + 13);
      });

      animFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrame);
  }, [robots, connected]);

  if (robots.length === 0) return null;

  return (
    <div className="glass-panel anim-fade-in" style={{ padding: '16px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Radio size={15} color="var(--brand-orange)" />
          P2P MESH NETWORK
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: networkStatus.color,
            boxShadow: `0 0 6px ${networkStatus.color}`
          }} />
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: networkStatus.color, letterSpacing: '0.06em' }}>
            {networkStatus.label}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={320}
        height={160}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />

      {/* Footer count */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTop: '1px solid var(--border-light)',
        fontSize: '0.72rem',
        fontWeight: 700,
        color: 'var(--text-secondary)'
      }}>
        <span>
          <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {onlineCount}/{totalRobots}
          </strong> NODES CONNECTED
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          {totalRobots > 1 ? `${(totalRobots * (totalRobots - 1)) / 2} LINKS` : '—'}
        </span>
      </div>
    </div>
  );
}
