import React, { useState } from 'react';
import {
  LayoutDashboard, Users, FileText, CheckSquare,
  Receipt, FileSpreadsheet, ClipboardList, LogOut,
  UserCheck, GitCompare, BarChart3, ChevronRight, Menu, X
} from 'lucide-react';

const STEPS = [
  { id: 'dashboard',  label: 'Dashboard',            icon: LayoutDashboard,  roles: ['admin', 'procurement', 'manager', 'vendor'], step: null },
  { id: 'onboarding', label: 'Vendor Onboarding',     icon: UserCheck,        roles: ['vendor'],                                    step: null },
  { id: 'vendors',    label: 'Vendor Registry',        icon: Users,            roles: ['admin', 'procurement', 'manager'],           step: 1  },
  { id: 'rfqs',       label: 'RFQs & Bids',           icon: FileText,         roles: ['admin', 'procurement', 'vendor'],            step: 2  },
  { id: 'compare',    label: 'Bid Evaluation',         icon: GitCompare,       roles: ['admin', 'procurement', 'manager'],           step: 4  },
  { id: 'approvals',  label: 'Approvals',              icon: CheckSquare,      roles: ['admin', 'manager', 'procurement'],           step: 5  },
  { id: 'pos',        label: 'Purchase Orders',        icon: ClipboardList,    roles: ['admin', 'procurement', 'manager', 'vendor'], step: 6  },
  { id: 'invoices',   label: 'Invoices & Billing',     icon: Receipt,          roles: ['admin', 'procurement', 'manager', 'vendor'], step: 8  },
  { id: 'logs',       label: 'Reports & Analytics',    icon: BarChart3,        roles: ['admin', 'manager', 'procurement'],           step: 10 },
];

const ROLE_META = {
  admin:       { label: 'System Administrator', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  procurement: { label: 'Procurement Officer',  color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  manager:     { label: 'Finance Manager',      color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  vendor:      { label: 'Vendor Portal',        color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
};

export default function Sidebar({ user, activeTab, setActiveTab, onLogout, vendorProfileApproved = true }) {
  const role = user?.role || 'vendor';
  const roleMeta = ROLE_META[role] || ROLE_META.vendor;
  const visible = STEPS.filter(item => item.roles.includes(role));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
      {/* Header with Hamburger */}
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '8px', flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
              <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              <rect width="20" height="14" x="2" y="6" rx="2" />
            </svg>
          </div>
          <div>
            <span className="logo-text">VendorBridge</span>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '500', letterSpacing: '0.04em', marginTop: '1px' }}>PROCUREMENT ERP</div>
          </div>
        </div>
        <button 
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
        >
          {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      <div className="sidebar-collapsible">

      {/* User role badge */}
      <div style={{ margin: '0.75rem 1rem', padding: '0.65rem 0.85rem', background: roleMeta.bg, borderRadius: '8px', border: `1px solid ${roleMeta.color}22` }}>
        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: roleMeta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{roleMeta.label}</div>
        <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#e2e8f0', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-menu">
        {/* Section header */}
        <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.25rem 0.75rem 0.5rem', marginTop: '0.25rem' }}>
          Navigation
        </div>

        {visible.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isRestricted = role === 'vendor' && !vendorProfileApproved && item.id !== 'onboarding' && item.id !== 'dashboard';

          return (
            <button
              key={item.id}
              onClick={() => { 
                if (!isRestricted) {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }
              }}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.65rem 0.85rem', width: '100%', border: 'none',
                background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: isActive ? '#a5b4fc' : (isRestricted ? '#334155' : '#94a3b8'),
                cursor: isRestricted ? 'not-allowed' : 'pointer',
                borderRadius: '7px', transition: 'all 0.15s ease',
                fontSize: '0.875rem', fontWeight: isActive ? '600' : '500',
                position: 'relative',
                borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
              }}
              title={isRestricted ? 'Onboarding approval required' : ''}
              disabled={isRestricted}
            >
              <Icon size={17} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              {item.step && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: '700',
                  padding: '1px 5px', borderRadius: '4px',
                  background: isActive ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
                  color: isActive ? '#c7d2fe' : '#475569',
                }}>
                  S{item.step}
                </span>
              )}
              {isActive && <ChevronRight size={13} style={{ flexShrink: 0 }} />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Procurement steps legend */}
        <div style={{ marginBottom: '0.75rem', padding: '0.65rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '7px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Procurement Flow</div>
          {['RFQ → Bids → Compare', 'Approve → PO → Invoice', 'Print · Email · Reports'].map((s, i) => (
            <div key={i} style={{ fontSize: '0.68rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
              {s}
            </div>
          ))}
        </div>

        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            width: '100%', padding: '0.6rem 0.85rem', border: 'none',
            background: 'rgba(244,63,94,0.08)', color: '#f87171', borderRadius: '7px',
            cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(244,63,94,0.15)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(244,63,94,0.08)'}
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
      </div>
    </aside>
  );
}
