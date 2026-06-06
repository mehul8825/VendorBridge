import React, { useState, useEffect } from 'react';
import Auth from './pages/Auth';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

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
    // Listen for custom auth-change events
    window.addEventListener('auth-change', checkAuth);
    return () => {
      window.removeEventListener('auth-change', checkAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('vb_token');
    localStorage.removeItem('vb_user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated) {
    return <Auth onLoginSuccess={checkAuth} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      color: '#0f172a',
      padding: '2rem',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div className="glass-panel" style={{
        padding: '3rem',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width: '28px', height: '28px'}}>
            <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            <rect width="20" height="14" x="2" y="6" rx="2" />
          </svg>
          <h2 style={{ fontSize: '1.35rem', fontFamily: 'Outfit, sans-serif', fontWeight: '700' }}>VendorBridge ERP</h2>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          You have successfully authenticated to the organization workspace portal.
        </p>

        <div style={{
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          padding: '1.25rem 0',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          fontSize: '0.9rem',
          color: '#334155'
        }}>
          <div><strong>User Name:</strong> {user.name}</div>
          <div><strong>Email Address:</strong> {user.email}</div>
          <div>
            <strong>Access Role:</strong>{' '}
            <span style={{
              textTransform: 'uppercase',
              fontWeight: '700',
              color: '#4f46e5',
              background: 'rgba(79, 70, 229, 0.08)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.8rem'
            }}>
              {user.role}
            </span>
          </div>
        </div>

        <button onClick={handleLogout} className="btn btn-danger" style={{ alignSelf: 'center', width: '100%', padding: '0.65rem' }}>
          Sign Out of Account
        </button>
      </div>
    </div>
  );
}
