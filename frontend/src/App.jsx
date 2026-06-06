import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import VendorManagement from './pages/VendorManagement';
import { api } from './services/api';
import { Bell, Sun, Moon, Lock } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const checkAuth = () => {
    const token = localStorage.getItem('vb_token');
    const userData = localStorage.getItem('vb_user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
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

  const renderPlaceholder = (moduleName, nextStepNumber) => (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', textAlign: 'center', height: '100%' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Lock size={30} />
      </div>
      <h3 style={{ fontFamily: 'var(--font-heading)' }}>{moduleName} Module Locked</h3>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '0.9rem' }}>
        This feature will be unlocked in **Step {nextStepNumber}** of the Procurement ERP rollout roadmap.
      </p>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Welcome back, {user.name}</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Monitor ERP procurement pipelines, transactions, and status boards.</p>
            </div>
            
            <div className="glass-panel" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)' }}>ERP Step 2 Active Workspaces</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
                You have successfully unlocked the **Vendor Management & Onboarding** module. 
              </p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                {user.role === 'vendor' ? (
                  <button onClick={() => setActiveTab('onboarding')} className="btn btn-primary">
                    Start Multi-Step Onboarding Form
                  </button>
                ) : (
                  <button onClick={() => setActiveTab('vendors')} className="btn btn-primary">
                    Open Vendor Registry Table
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      case 'onboarding':
        return <Onboarding user={user} onProfileUpdated={fetchNotifications} />;
      case 'vendors':
        return <VendorManagement user={user} />;
      case 'rfqs':
        return renderPlaceholder('RFQs & Bids Board', 3);
      case 'approvals':
        return renderPlaceholder('Workflow approvals', 4);
      case 'pos':
        return renderPlaceholder('Purchase Orders', 5);
      case 'invoices':
        return renderPlaceholder('Invoicing & Billing', 5);
      case 'logs':
        return renderPlaceholder('Audit logs spreadsheet', 6);
      default:
        return <Onboarding user={user} />;
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
      />

      {/* Main Panel */}
      <main className="main-content">
        {/* Top Header Bar */}
        <div className="top-bar">
          <h2 style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
            {(() => {
              switch (activeTab) {
                case 'dashboard': return 'Dashboard Overview';
                case 'onboarding': return 'Vendor Onboarding';
                case 'vendors': return 'Vendor Registry';
                case 'rfqs': return 'Requests for Quotations (Locked)';
                case 'compare': return 'Bid Evaluation Board (Locked)';
                case 'approvals': return 'Workflow Sign-offs (Locked)';
                case 'pos': return 'Purchase Orders (Locked)';
                case 'invoices': return 'Invoicing & Payments (Locked)';
                case 'logs': return 'Audit Logs & Analytics (Locked)';
                default: return 'VendorBridge ERP';
              }
            })()}
          </h2>

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
