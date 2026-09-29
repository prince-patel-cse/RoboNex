import React from 'react';
import { Terminal } from 'lucide-react';

export function ConflictLog({ events = [] }) {
  const getBadgeStyle = (source, type) => {
    if (type === 'error' || source === 'DEADLOCK') {
      return { bg: 'var(--status-rose-bg)', color: 'var(--status-rose)', border: 'var(--status-rose)' };
    }
    if (type === 'warning' || source === 'WARNING') {
      return { bg: 'var(--brand-orange-light)', color: 'var(--brand-orange)', border: 'var(--brand-orange)' };
    }
    if (type === 'success' || source === 'ALLOCATION') {
      return { bg: 'var(--status-emerald-bg)', color: 'var(--status-emerald)', border: 'var(--status-emerald)' };
    }
    if (source === 'REROUTE') {
      return { bg: 'var(--status-blue-bg)', color: 'var(--status-blue)', border: 'var(--status-blue)' };
    }
    return { bg: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: 'var(--border-strong)' };
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Terminal size={18} color="var(--text-primary)" />
          Telemetry & Event Feed Log
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          {events.length} Events Streamed
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '200px', overflowY: 'auto' }}>
        {events.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center', padding: '16px 0' }}>
            No telemetry events logged yet.
          </div>
        ) : (
          events.map((e) => {
            const style = getBadgeStyle(e.source, e.type);
            return (
              <div
                key={e.id}
                style={{
                  padding: '8px 10px',
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '0.78rem'
                }}
              >
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600, minWidth: 60 }}>
                  {e.time}
                </span>

                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: style.color,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'var(--bg-card)',
                    border: `1px solid ${style.border}`
                  }}
                >
                  {e.source}
                </span>

                <span style={{ color: 'var(--text-primary)', fontWeight: 600, flex: 1 }}>
                  {e.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
