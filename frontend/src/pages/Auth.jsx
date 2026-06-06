import React, { useState } from 'react';
import { api } from '../services/api';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('vendor');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const data = await api.post('/auth/login', { email, password });
        localStorage.setItem('vb_token', data.token);
        localStorage.setItem('vb_user', JSON.stringify({ id: data.id, name: data.name, email: data.email, role: data.role }));
        onLoginSuccess();
      } else {
        const data = await api.post('/auth/signup', { name, email, password, role });
        localStorage.setItem('vb_token', data.token);
        localStorage.setItem('vb_user', JSON.stringify({ id: data.id, name: data.name, email: data.email, role: data.role }));
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setForgotSuccess('');
    if (!forgotEmail) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setForgotSuccess(`Reset password link has been sent to ${forgotEmail}. Please check your inbox.`);
      setLoading(false);
    }, 1200);
  };

  if (forgotPasswordMode) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card glass-panel">
          <h2 style={{ textAlign: 'center', marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>Reset Password</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', textAlign: 'center' }}>
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {forgotSuccess ? (
            <div style={{ padding: '1rem', background: 'var(--success-glow)', border: '1px solid var(--success)', borderRadius: '8px', color: 'var(--success)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {forgotSuccess}
            </div>
          ) : null}

          <form onSubmit={handleForgotPassword}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="form-control"
                placeholder="name@company.com"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>
          </form>

          <button
            onClick={() => { setForgotPasswordMode(false); setForgotSuccess(''); setError(''); }}
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '1rem', background: 'transparent' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card glass-panel">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width: '32px', height: '32px'}}>
            <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            <rect width="20" height="14" x="2" y="6" rx="2" />
          </svg>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: '800', background: 'linear-gradient(to right, #fff, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>VendorBridge</h1>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Procurement & Vendor Management ERP System
        </p>

        <div className="auth-tabs">
          <div className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => { setIsLogin(true); setError(''); }}>
            Login
          </div>
          <div className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => { setIsLogin(false); setError(''); }}>
            Create Account
          </div>
        </div>

        {error ? (
          <div style={{ padding: '0.75rem 1rem', background: 'var(--error-glow)', border: '1px solid var(--error)', borderRadius: '8px', color: 'var(--error)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          {!isLogin ? (
            <>
              <div className="form-group">
                <label className="form-label">Full Name / Business Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-control"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">System Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="form-control"
                  style={{ background: 'var(--input-bg)' }}
                >
                  <option value="vendor">Vendor / Supplier</option>
                  <option value="procurement">Procurement Officer</option>
                  <option value="manager">Manager / Approver</option>
                  <option value="admin">ERP System Admin</option>
                </select>
              </div>
            </>
          ) : null}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              placeholder="email@company.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
              placeholder="••••••••"
              required
            />
          </div>

          {isLogin ? (
            <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => { setForgotPasswordMode(true); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}
              >
                Forgot Password?
              </button>
            </div>
          ) : null}

          <button type="submit" className="btn btn-primary glow-hover" style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create ERP Account'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <p>Demo accounts for testing:</p>
          <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            <button type="button" onClick={() => { setEmail('admin@vendorbridge.com'); setPassword('password123'); setIsLogin(true); }} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Admin</button>
            <button type="button" onClick={() => { setEmail('procurement@vendorbridge.com'); setPassword('password123'); setIsLogin(true); }} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Procurement</button>
            <button type="button" onClick={() => { setEmail('manager@vendorbridge.com'); setPassword('password123'); setIsLogin(true); }} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Manager</button>
            <button type="button" onClick={() => { setEmail('acme@vendorbridge.com'); setPassword('password123'); setIsLogin(true); }} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Vendor</button>
          </div>
        </div>
      </div>
    </div>
  );
}
