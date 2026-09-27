import React from 'react';
import { Activity, ShieldAlert, CheckCircle, Info, RefreshCw } from 'lucide-react';

export function ConflictLog({ events = [] }) {
  const getBadge = (type) => {
    switch (type) {
      case 'error':
        return { icon: <ShieldAlert size={14} color="#f43f5e" />, bg: 'rgba(244,63,94,0.1)' };
      case 'warning':
        return { icon: <RefreshCw size={14} color="#f59e0b" />, bg: 'rgba(245,158,11,0.1)' };
      case 'success':
        return { icon: <CheckCircle size={14} color="#10b981" />, bg: 'rgba(16,185,129,0.1)' };
      default:
        return { icon: <Info size={14} color="#06b6d4" />, bg: 'rgba(6,182,212,0.1)' };
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Activity size={18} color="#a855f7" />
        Decentralized P2P & Conflict Log
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '250px', overflowY: 'auto' }}>
        {events.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
            Awaiting simulation telemetry...
          </div>
        ) : (
          events.map(ev => {
            const badge = getBadge(ev.type);
            return (
              <div
                key={ev.id}
                style={{
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  fontSize: '0.75rem'
                }}
              >
                <div style={{ padding: 4, borderRadius: 4, background: badge.bg, marginTop: 1 }}>
                  {badge.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>[{ev.source}]</span>
                    <span style={{ color: '#64748b', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                      tick {ev.tick} • {ev.time}
                    </span>
                  </div>
                  <div style={{ color: '#94a3b8', lineHeight: 1.4 }}>{ev.message}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
