import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, ArrowRight, X, Zap, Shield } from 'lucide-react';

/**
 * ConflictAlert — floating overlay showing live conflict / reroute / deadlock events.
 * Parses the last relevant event from state.events and displays a rich card.
 * Auto-dismisses after 4.5 seconds. New events reset the timer.
 */
export function ConflictAlert({ events = [], robots = [] }) {
  const [activeAlert, setActiveAlert] = useState(null);
  const [exiting, setExiting] = useState(false);
  const dismissTimer = useRef(null);
  const lastEventId = useRef(null);

  // Parse robot IDs mentioned in the message
  const parseRobotIds = (message) => {
    const matches = message.match(/R\d+/g);
    return matches ? [...new Set(matches)] : [];
  };

  // Build conflict card from an event
  const buildAlert = (event) => {
    const ids = parseRobotIds(event.message);
    const isDeadlock = event.source === 'DEADLOCK';
    const isReroute  = event.source === 'REROUTE' || event.source === 'BLOCKED';
    const isReassign = event.source === 'REASSIGN';
    const isWarning  = event.source === 'WARNING';

    let title, icon, color, border, resolution;

    if (isDeadlock) {
      title = '⚠ DEADLOCK DETECTED';
      icon = 'deadlock';
      color = 'var(--status-rose)';
      border = 'var(--status-rose-bg)';
      resolution = ids.length > 0
        ? `${ids[0]} → Priority yield initiated`
        : 'Recovery in progress...';
    } else if (isReroute) {
      title = '↺ PATH RECALCULATING';
      icon = 'reroute';
      color = 'var(--status-blue)';
      border = 'var(--status-blue-bg)';
      resolution = ids.length > 0
        ? `${ids[0]} → Re-routing around obstacle`
        : 'Replanning...';
    } else if (isReassign) {
      title = '⟳ TASK REASSIGNED';
      icon = 'reassign';
      color = 'var(--brand-orange)';
      border = 'var(--brand-orange-light)';
      resolution = event.message;
    } else if (isWarning) {
      title = '⚡ CONFLICT DETECTED';
      icon = 'conflict';
      color = 'var(--status-amber)';
      border = 'var(--status-amber-bg)';
      resolution = event.message;
    } else {
      return null;
    }

    return { title, icon, color, border, resolution, ids, message: event.message, source: event.source, time: event.time };
  };

  useEffect(() => {
    if (events.length === 0) return;

    const conflictSources = new Set(['REROUTE', 'DEADLOCK', 'REASSIGN', 'BLOCKED', 'WARNING']);
    const latest = events.find(e => conflictSources.has(e.source));
    if (!latest || latest.id === lastEventId.current) return;

    const alert = buildAlert(latest);
    if (!alert) return;

    lastEventId.current = latest.id;

    // If already showing, dismiss first
    if (activeAlert) {
      setExiting(true);
      setTimeout(() => {
        setExiting(false);
        setActiveAlert(alert);
      }, 320);
    } else {
      setActiveAlert(alert);
    }

    // Auto-dismiss
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setExiting(false);
        setActiveAlert(null);
      }, 320);
    }, 4500);

    return () => clearTimeout(dismissTimer.current);
  }, [events]);

  const handleDismiss = () => {
    clearTimeout(dismissTimer.current);
    setExiting(true);
    setTimeout(() => {
      setExiting(false);
      setActiveAlert(null);
    }, 320);
  };

  if (!activeAlert) return null;

  const iconEl = activeAlert.icon === 'deadlock'
    ? <Zap size={16} color={activeAlert.color} />
    : activeAlert.icon === 'reroute'
    ? <ArrowRight size={16} color={activeAlert.color} />
    : <Shield size={16} color={activeAlert.color} />;

  return (
    <div
      className={exiting ? 'conflict-alert-exit' : 'conflict-alert-enter'}
      style={{
        position: 'fixed',
        top: 84,
        right: 24,
        zIndex: 2000,
        width: 310,
        background: 'var(--bg-card)',
        border: `1px solid ${activeAlert.color}`,
        borderLeft: `4px solid ${activeAlert.color}`,
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* Progress bar that shrinks over 4.5s */}
      <div style={{ height: 2, background: 'var(--border-light)', position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            background: activeAlert.color,
            width: '100%',
            animation: 'conflictProgressShrink 4.5s linear forwards'
          }}
        />
      </div>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px 6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {iconEl}
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 900,
            color: activeAlert.color,
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            {activeAlert.title}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, lineHeight: 1, display: 'flex' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '4px 14px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {/* Robot IDs involved */}
        {activeAlert.ids.length >= 2 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: activeAlert.border,
            padding: '6px 10px',
            borderRadius: 6
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              {activeAlert.ids[0]}
            </span>
            <span style={{ color: activeAlert.color, fontWeight: 900 }}>↔</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              {activeAlert.ids[1]}
            </span>
          </div>
        )}
        {activeAlert.ids.length === 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: activeAlert.border,
            padding: '6px 10px',
            borderRadius: 6
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              {activeAlert.ids[0]}
            </span>
          </div>
        )}

        {/* Message */}
        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.4, margin: 0 }}>
          {activeAlert.message}
        </p>

        {/* Resolution line */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: '0.68rem',
          fontWeight: 800,
          color: activeAlert.color
        }}>
          <ArrowRight size={11} />
          {activeAlert.resolution}
        </div>

        {/* Timestamp */}
        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          {activeAlert.time} · SRC: {activeAlert.source}
        </div>
      </div>
    </div>
  );
}
