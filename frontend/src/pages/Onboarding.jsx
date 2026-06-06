import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShieldAlert, ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

export default function Onboarding({ user, onProfileUpdated }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Multi-step Wizard state
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  const fetchProfile = async () => {
    try {
      const data = await api.get('/vendors/profile');
      setProfile(data);
      if (data) {
        setCompanyName(data.companyName || '');
        setCategory(data.category || '');
        setGstNumber(data.gstNumber || '');
        setPhone(data.phone || '');
        setContactPerson(data.contactPerson || '');
      }
    } catch (err) {
      // Profile might not exist, that's fine
      console.log('No profile exists yet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 3) {
      setStep(prev => prev + 1);
      return;
    }

    setSubmitLoading(true);
    setError('');

    try {
      const payload = {
        companyName,
        category,
        gstNumber,
        phone,
        contactPerson
      };
      const data = await api.post('/vendors/onboard', payload);
      setProfile(data);
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setError(err.message || 'Onboarding submission failed.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Loading onboarding details...</div>;

  // Render status if already pending or approved
  if (profile && profile.status === 'approved') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px', margin: '2rem auto' }}>
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success-glow)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={40} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)' }}>Verified Vendor Account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            Your business profile has been reviewed and approved by the procurement board. You now have full access to bidding, active RFQ lists, and invoices.
          </p>
          
          <div style={{ width: '100%', borderTop: '1px solid var(--panel-border)', marginTop: '1.5rem', paddingTop: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Company:</span>
              <span style={{ fontWeight: '600' }}>{profile.companyName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Category:</span>
              <span style={{ fontWeight: '600' }}>{profile.category}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>GSTIN:</span>
              <code>{profile.gstNumber}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Rating:</span>
              <span style={{ fontWeight: '600', color: '#fbbf24' }}>★ {profile.rating.toFixed(1)} / 5.0</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (profile && profile.status === 'pending') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px', margin: '2rem auto' }}>
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--warning-glow)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={40} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)' }}>Under Review</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            Your onboarding application is currently pending evaluation. An administrator will review your categories, tax identification number, and business profile shortly.
          </p>

          <div style={{ width: '100%', borderTop: '1px solid var(--panel-border)', marginTop: '1.5rem', paddingTop: '1.5rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <p>Submitted Details Summary:</p>
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <div><strong>Company:</strong> {profile.companyName}</div>
              <div><strong>GSTIN:</strong> {profile.gstNumber}</div>
              <div><strong>Category:</strong> {profile.category}</div>
            </div>
          </div>

          <button onClick={() => setProfile(null)} className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>
            Update Submitted Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Vendor Onboarding Wizard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Fill in your commercial profiles and GST registrations to start bidding.</p>
      </div>

      {/* Progress Line */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem' }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: step === s ? 'var(--primary)' : step > s ? 'var(--success)' : 'rgba(255,255,255,0.05)',
              color: step >= s ? '#fff' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: '700'
            }}>{step > s ? '✓' : s}</span>
            <span style={{ fontSize: '0.8rem', color: step === s ? 'var(--text-main)' : 'var(--text-muted)' }}>
              {s === 1 ? 'Business Info' : s === 2 ? 'Tax Details' : 'Financial Contact'}
            </span>
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {error ? (
          <div style={{ padding: '0.75rem 1rem', background: 'var(--error-glow)', border: '1px solid var(--error)', borderRadius: '8px', color: 'var(--error)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Step 1: Business Identification</h3>
              
              <div className="form-group">
                <label className="form-label">Registered Corporate Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="form-control"
                  placeholder="e.g. Apex Engineering Solutions Private Limited"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Goods & Services Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="form-control"
                  required
                >
                  <option value="">Select primary category...</option>
                  <option value="IT & Hardware">IT & Hardware (Laptops, Servers)</option>
                  <option value="Logistics">Logistics (Shipping, Distribution)</option>
                  <option value="Office Furniture">Office Furniture (Office setup, Chairs)</option>
                  <option value="Consulting Services">Consulting Services (Legal, Financial)</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Step 2: GSTIN Registry</h3>
              
              <div className="form-group">
                <label className="form-label">GST Number (15-character Alphanumeric)</label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  className="form-control"
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  maxLength={15}
                  required
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Step 3: Point of Contact</h3>
              
              <div className="form-group">
                <label className="form-label">Contact Person Name</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="form-control"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Business Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-control"
                  placeholder="+91 XXXXX XXXXX"
                  required
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', borderTop: '1px solid var(--panel-border)', paddingTop: '1.5rem' }}>
            {step > 1 ? (
              <button type="button" onClick={() => setStep(prev => prev - 1)} className="btn btn-secondary">
                <ArrowLeft size={16} /> Back
              </button>
            ) : <div />}

            <button type="submit" className="btn btn-primary" disabled={submitLoading}>
              {step < 3 ? (
                <>Next Step <ArrowRight size={16} /></>
              ) : (
                submitLoading ? 'Submitting profile...' : <>Complete & Submit <CheckCircle2 size={16} /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
