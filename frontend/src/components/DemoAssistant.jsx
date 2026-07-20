import React, { useState } from 'react';
import { api } from '../services/api';
import { Rocket, RefreshCw, LogIn, X } from 'lucide-react';

export default function DemoAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = async (email, password) => {
    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem('vb_token', data.token);
      localStorage.setItem('vb_user', JSON.stringify({ id: data.id, name: data.name, email: data.email, role: data.role }));
      window.dispatchEvent(new Event('auth-change'));
    } catch (err) {
      alert('Login failed: ' + err.message);
    }
  };

  const handleResetDB = async () => {
    setLoading(true);
    try {
      await api.post('/demo/reset');
      alert('Database reset to clean state!');
      localStorage.clear();
      window.dispatchEvent(new Event('auth-change'));
    } catch (err) {
      alert('Reset failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFastForward = async () => {
    setLoading(true);
    try {
      await api.post('/demo/fast-forward');
      alert('Fast forward simulation completed! Login as Manager to see results.');
      localStorage.clear();
      window.dispatchEvent(new Event('auth-change'));
    } catch (err) {
      alert('Fast forward failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999,
          background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50px',
          padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.5)', cursor: 'pointer',
          fontFamily: 'var(--font-heading)', fontWeight: '600', transition: 'all 0.3s'
        }}
      >
        <Rocket size={18} /> Demo Autopilot
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999,
      background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '12px',
      width: '320px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ background: 'var(--primary)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
          <Rocket size={16} color="white" /> Demo Assistant
        </h3>
        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <X size={18} color="white" />
        </button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div>
          <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>1. Quick Switch Roles</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button onClick={() => handleQuickLogin('admin@vendorbridge.com', 'password123')} className="btn btn-secondary" style={{ padding: '6px', fontSize: '0.75rem' }}>Admin</button>
            <button onClick={() => handleQuickLogin('procurement@vendorbridge.com', 'password123')} className="btn btn-secondary" style={{ padding: '6px', fontSize: '0.75rem' }}>Procurement</button>
            <button onClick={() => handleQuickLogin('acme@vendorbridge.com', 'password123')} className="btn btn-secondary" style={{ padding: '6px', fontSize: '0.75rem' }}>Vendor</button>
            <button onClick={() => handleQuickLogin('manager@vendorbridge.com', 'password123')} className="btn btn-secondary" style={{ padding: '6px', fontSize: '0.75rem' }}>Manager</button>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--panel-border)' }}></div>

        <div>
          <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>2. Workflow Simulators</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={handleResetDB} disabled={loading} className="btn btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', gap: '8px', background: 'var(--bg-color)' }}>
              <RefreshCw size={14} /> {loading ? 'Processing...' : 'Reset DB (Clean State)'}
            </button>
            <button onClick={handleFastForward} disabled={loading} className="btn btn-primary glow-hover" style={{ width: '100%', padding: '8px', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <Rocket size={14} /> {loading ? 'Processing...' : 'Simulate Completed Flow'}
            </button>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
              Fast-forward instantly seeds the DB with a full workflow (RFQs, Quotations, accepted POs, and Paid Invoices).
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
