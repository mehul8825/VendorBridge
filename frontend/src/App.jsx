import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import VendorManagement from './pages/VendorManagement';
import Onboarding from './pages/Onboarding';
import RFQs from './pages/RFQs';
import BidComparison from './pages/BidComparison';
import Approvals from './pages/Approvals';
import PurchaseOrders from './pages/PurchaseOrders';
import Invoices from './pages/Invoices';
import LogsReports from './pages/LogsReports';
import { api } from './services/api';
import { Bell, Sun, Moon, Sparkles } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [comparisonRfqId, setComparisonRfqId] = useState(null);
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
    // Listen for custom auth-change events (e.g. from API logout)
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
      // Poll notifications every 15s in background
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

  const renderContent = () => {
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
        return <Onboarding user={user} onProfileUpdated={fetchNotifications} />;
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
        return <Dashboard user={user} setActiveTab={setActiveTab} />;
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
        {/* Top Header Workspace */}
        <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1.5rem', position: 'relative' }}>
          
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
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Notifications Center</span>
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
                          background: notif.isRead ? 'transparent' : 'rgba(255,255,255,0.02)',
                          borderLeft: notif.isRead ? 'none' : '3px solid var(--primary)',
                          cursor: 'pointer', transition: 'var(--transition)'
                        }}
                      >
                        <p style={{ color: notif.isRead ? 'var(--text-secondary)' : '#fff' }}>{notif.message}</p>
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
        </header>

        {/* Dynamic Workspace */}
        <div style={{ flex: 1 }}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
