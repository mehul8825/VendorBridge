import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import VendorManagement from './pages/VendorManagement';
import Dashboard from './pages/Dashboard';
import RFQs from './pages/RFQs';
import BidComparison from './pages/BidComparison';
import Approvals from './pages/Approvals';
import PurchaseOrders from './pages/PurchaseOrders';
import Invoices from './pages/Invoices';
import LogsReports from './pages/LogsReports';
import { api } from './services/api';
import { Bell, Sun, Moon, User } from 'lucide-react';

const TAB_META = {
  dashboard:  { title: 'Dashboard Overview',       subtitle: 'Real-time procurement metrics and KPIs',      step: null },
  onboarding: { title: 'Vendor Onboarding',         subtitle: 'Complete company profile and await approval',  step: null },
  vendors:    { title: 'Vendor Registry',            subtitle: 'Step 1 — Manage approved vendor profiles',    step: 1 },
  rfqs:       { title: 'RFQ & Bid Workspace',        subtitle: 'Step 2 & 3 — Create RFQs and collect vendor quotations', step: 2 },
  compare:    { title: 'Bid Evaluation Matrix',      subtitle: 'Step 4 — Side-by-side quotation comparison',  step: 4 },
  approvals:  { title: 'Approval Workflow',          subtitle: 'Step 5 — Manager review and sign-off',         step: 5 },
  pos:        { title: 'Purchase Orders',            subtitle: 'Step 6 & 7 — Generate POs and send to vendor', step: 6 },
  invoices:   { title: 'Invoices & Billing',         subtitle: 'Step 8 & 9 — Generate, approve, and email invoices', step: 8 },
  logs:       { title: 'Reports & Analytics',        subtitle: 'Step 10 & 11 — Audit trail and spend reports', step: 10 },
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [vendorProfileApproved, setVendorProfileApproved] = useState(true);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [comparisonRfqId, setComparisonRfqId] = useState(null);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const checkVendorProfileStatus = async (currentUser) => {
    const u = currentUser || user;
    if (!u || u.role !== 'vendor') {
      setVendorProfileApproved(true);
      return;
    }
    setCheckingProfile(true);
    try {
      const profile = await api.get('/vendors/profile');
      if (profile && profile.status === 'approved') {
        setVendorProfileApproved(true);
      } else {
        setVendorProfileApproved(false);
        setActiveTab('onboarding');
      }
    } catch (err) {
      setVendorProfileApproved(false);
      setActiveTab('onboarding');
    } finally {
      setCheckingProfile(false);
    }
  };

  const checkAuth = () => {
    const token = localStorage.getItem('vb_token');
    const userData = localStorage.getItem('vb_user');
    if (token && userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setIsAuthenticated(true);
      checkVendorProfileStatus(parsedUser);
    } else {
      setUser(null);
      setIsAuthenticated(false);
      setVendorProfileApproved(true);
    }
  };

  useEffect(() => {
    checkAuth();
    window.addEventListener('auth-change', checkAuth);
    return () => {
      window.removeEventListener('auth-change', checkAuth);
    };
  }, []);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.get('/auth/notifications');
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (err) {
      console.log('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleMarkNotificationRead = async (id) => {
    try {
      await api.put(`/auth/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.log(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('vb_token');
    localStorage.removeItem('vb_user');
    setIsAuthenticated(false);
    setUser(null);
    setVendorProfileApproved(true);
    setCheckingProfile(false);
    setActiveTab('dashboard');
  };

  const toggleTheme = () => {
    setIsDarkTheme(prev => {
      const next = !prev;
      if (next) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
      return next;
    });
  };

  if (!isAuthenticated) {
    return <Auth onLoginSuccess={checkAuth} />;
  }

  // placeholder no longer needed — all modules are active

  const renderContent = () => {
    if (checkingProfile) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Verifying workspace profile...</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            user={user} 
            setActiveTab={setActiveTab} 
            setComparisonRfqId={setComparisonRfqId} 
          />
        );
      case 'onboarding':
        return <Onboarding user={user} onProfileUpdated={() => { fetchNotifications(); checkVendorProfileStatus(); }} />;
      case 'vendors':
        return <VendorManagement user={user} />;
      case 'rfqs':
        return (
          <RFQs 
            user={user} 
            setActiveTab={setActiveTab} 
            setComparisonRfqId={setComparisonRfqId} 
          />
        );
      case 'compare':
        return (
          <BidComparison 
            user={user} 
            rfqId={comparisonRfqId} 
            setActiveTab={setActiveTab} 
          />
        );
      case 'approvals':
        return <Approvals user={user} />;
      case 'pos':
        return <PurchaseOrders user={user} />;
      case 'invoices':
        return <Invoices user={user} />;
      case 'logs':
        return <LogsReports user={user} />;
      default:
        return (
          <Dashboard 
            user={user} 
            setActiveTab={setActiveTab} 
            setComparisonRfqId={setComparisonRfqId} 
          />
        );
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
        vendorProfileApproved={vendorProfileApproved}
      />

      {/* Main Panel */}
      <main className="main-content">
        {/* Top Header Bar */}
        <div className="top-bar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {TAB_META[activeTab]?.step && (
                <span style={{ fontSize: '0.62rem', fontWeight: '800', padding: '2px 7px', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Step {TAB_META[activeTab].step}
                </span>
              )}
              <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', fontFamily: 'var(--font-heading)', margin: 0 }}>
                {TAB_META[activeTab]?.title || 'VendorBridge ERP'}
              </h2>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              {TAB_META[activeTab]?.subtitle || 'Procurement & Vendor Management ERP'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Light/Dark Toggle */}
            <button 
              onClick={toggleTheme} 
              className="btn btn-secondary" 
              style={{ borderRadius: '50%', padding: '0.6rem', width: '38px', height: '38px' }}
              title={isDarkTheme ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {isDarkTheme ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications Center */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="btn btn-secondary"
                style={{ borderRadius: '50%', padding: '0.6rem', width: '38px', height: '38px', position: 'relative' }}
                title="Notifications Panel"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-4px', right: '-4px',
                    background: 'var(--error)', color: '#fff', fontSize: '0.65rem',
                    fontWeight: '700', padding: '2px 5px', borderRadius: '99px',
                    boxShadow: '0 0 8px var(--error-glow)'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div 
                  className="glass-panel" 
                  style={{
                    position: 'absolute', top: '48px', right: '0',
                    width: '320px', maxHeight: '400px', overflowY: 'auto',
                    zIndex: 200, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>Notifications</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({unreadCount} unread)</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {notifications.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem 0', textAlign: 'center' }}>
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id}
                          onClick={() => handleMarkNotificationRead(notif.id)}
                          style={{
                            fontSize: '0.8rem', padding: '0.5rem', borderRadius: '6px',
                            background: notif.isRead ? 'transparent' : 'rgba(0,0,0,0.02)',
                            borderLeft: notif.isRead ? 'none' : '3px solid var(--primary)',
                            cursor: 'pointer', transition: 'var(--transition)'
                          }}
                        >
                          <p style={{ color: notif.isRead ? 'var(--text-secondary)' : 'var(--text-main)', margin: 0 }}>{notif.message}</p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Dynamic Workspace Body */}
        <div className="content-body">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
