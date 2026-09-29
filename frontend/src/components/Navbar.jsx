import React from 'react';
import { 
  Box, 
  LayoutDashboard, 
  Bot, 
  Globe, 
  Radio, 
  Sun, 
  Moon
} from 'lucide-react';

export function Navbar({ currentView, setCurrentView, theme, toggleTheme, robotCount = 0, connected = true }) {
  return (
    <header 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-light)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        backdropFilter: 'blur(16px)',
        transition: 'all 0.2s ease'
      }}
    >
      <div 
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20
        }}
      >
        {/* Left Brand Badge */}
        <div 
          onClick={() => setCurrentView('landing')} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12, 
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div 
            style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 8, 
              background: 'var(--brand-orange)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.35)'
            }}
          >
            <Box size={20} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                ROBONEX
              </span>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#10b981' : '#ef4444', display: 'inline-block' }} />
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.02em' }}>
              Decentralized AMR Swarm
            </div>
          </div>
        </div>

        {/* Center Unique Floating Nav Dock */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-subtle)',
            padding: '4px',
            borderRadius: 12,
            border: '1px solid var(--border-light)',
            gap: 4
          }}
        >
          {/* Landing Page Tab */}
          <button
            type="button"
            onClick={() => setCurrentView('landing')}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              background: currentView === 'landing' ? 'var(--brand-orange)' : 'transparent',
              color: currentView === 'landing' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: currentView === 'landing' ? '0 2px 8px rgba(234, 88, 12, 0.3)' : 'none'
            }}
          >
            <Globe size={16} />
            <span>Overview</span>
          </button>

          {/* Simulator / Dashboard Tab */}
          <button
            type="button"
            onClick={() => setCurrentView('simulator')}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              background: currentView === 'simulator' ? 'var(--brand-orange)' : 'transparent',
              color: currentView === 'simulator' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: currentView === 'simulator' ? '0 2px 8px rgba(234, 88, 12, 0.3)' : 'none'
            }}
          >
            <LayoutDashboard size={16} />
            <span>Live Grid Simulator</span>
            <span style={{ 
              fontSize: '0.62rem', 
              padding: '1px 5px', 
              borderRadius: 4, 
              background: currentView === 'simulator' ? 'rgba(255,255,255,0.25)' : 'var(--status-emerald-bg)', 
              color: currentView === 'simulator' ? '#ffffff' : 'var(--status-emerald)',
              fontWeight: 900
            }}>
              LIVE
            </span>
          </button>

          {/* Dedicated Robots Page Tab */}
          <button
            type="button"
            onClick={() => setCurrentView('robots')}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              background: currentView === 'robots' ? 'var(--brand-orange)' : 'transparent',
              color: currentView === 'robots' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: currentView === 'robots' ? '0 2px 8px rgba(234, 88, 12, 0.3)' : 'none'
            }}
          >
            <Bot size={16} />
            <span>Robots Fleet</span>
            {robotCount > 0 && (
              <span style={{ 
                fontSize: '0.68rem', 
                padding: '1px 6px', 
                borderRadius: 10, 
                background: currentView === 'robots' ? '#ffffff' : 'var(--brand-orange-light)', 
                color: currentView === 'robots' ? 'var(--brand-orange)' : 'var(--brand-orange)',
                fontWeight: 900,
                border: currentView === 'robots' ? 'none' : '1px solid var(--brand-orange)'
              }}>
                {robotCount}
              </span>
            )}
          </button>
        </div>

        {/* Right Utility Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* P2P Mesh Connection Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-light)' }}>
            <Radio size={14} color={connected ? '#10b981' : '#ef4444'} />
            <span>P2P: <strong style={{ color: 'var(--text-primary)' }}>{connected ? 'Active' : 'Offline'}</strong></span>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon size={15} color="var(--brand-orange)" /> : <Sun size={15} color="#f59e0b" />}
            <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
