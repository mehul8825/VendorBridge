import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CheckSquare, 
  Receipt, 
  FileSpreadsheet, 
  ClipboardList, 
  LogOut,
  UserCheck
} from 'lucide-react';

export default function Sidebar({ user, activeTab, setActiveTab, onLogout }) {
  const role = user?.role || 'vendor';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'procurement', 'manager', 'vendor'] },
    { id: 'onboarding', label: 'Vendor Onboarding', icon: UserCheck, roles: ['vendor'] },
    { id: 'vendors', label: 'Vendor Registry', icon: Users, roles: ['admin', 'procurement', 'manager'] },
    { id: 'rfqs', label: 'RFQs & Bids', icon: FileText, roles: ['admin', 'procurement', 'vendor'] },
    { id: 'approvals', label: 'Workflow Approvals', icon: CheckSquare, roles: ['admin', 'manager'] },
    { id: 'pos', label: 'Purchase Orders', icon: ClipboardList, roles: ['admin', 'procurement', 'manager', 'vendor'] },
    { id: 'invoices', label: 'Invoices & Billing', icon: Receipt, roles: ['admin', 'procurement', 'manager', 'vendor'] },
    { id: 'logs', label: 'Audit Logs & Analytics', icon: FileSpreadsheet, roles: ['admin'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  const roleLabel = {
    admin: 'Administrator',
    procurement: 'Procurement Officer',
    manager: 'Approver / Manager',
    vendor: 'Vendor Portal'
  }[role] || 'User';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width: '28px', height: '28px'}}>
          <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          <rect width="20" height="14" x="2" y="6" rx="2" />
        </svg>
        <span className="logo-text">VendorBridge</span>
      </div>

      <nav className="sidebar-menu">
        {filteredItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (item.id === 'rfqs' && activeTab === 'compare');
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar-link btn-secondary btn ${isActive ? 'active' : ''}`}
              style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', width: '100%' }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 0.5rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>{user?.name}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{roleLabel}</span>
        </div>
        
        <button 
          onClick={onLogout}
          className="btn btn-secondary"
          style={{ justifyContent: 'flex-start', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--error)', marginTop: '0.5rem' }}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
