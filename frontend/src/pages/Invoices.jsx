import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Printer, Mail, DollarSign, ChevronRight, Send, AlertCircle } from 'lucide-react';

export default function Invoices({ user }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected Invoice
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetailLoading, setInvoiceDetailLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  // Email modal overlay
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResult, setEmailResult] = useState(null);

  const fetchInvoices = async () => {
    try {
      const data = await api.get('/invoices');
      setInvoices(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch Invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleSelectInvoice = async (id) => {
    setInvoiceDetailLoading(true);
    try {
      const data = await api.get(`/invoices/${id}`);
      setSelectedInvoice(data);
    } catch (err) {
      alert(err.message || 'Failed to retrieve Invoice details');
    } finally {
      setInvoiceDetailLoading(false);
    }
  };

  const handlePayInvoice = async () => {
    setPayLoading(true);
    try {
      await api.put(`/invoices/${selectedInvoice.id}/pay`);
      alert(`Invoice ${selectedInvoice.invoiceNumber} processed and paid successfully.`);
      handleSelectInvoice(selectedInvoice.id);
      fetchInvoices();
    } catch (err) {
      alert(err.message || 'Payment processing failed');
    } finally {
      setPayLoading(false);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailResult(null);

    try {
      const result = await api.post(`/invoices/${selectedInvoice.id}/email`, { email: emailAddress });
      setEmailResult(result);
      alert('Email successfully dispatched!');
    } catch (err) {
      alert(err.message || 'Failed to send invoice email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Invoices & Billing</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Verify commercial tax bills, track payout cycles, and issue document receipts.</p>
      </div>

      <div className="dashboard-grid">
        {/* Left Side: Invoice Feed */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>Invoice Registry</h3>

          {loading ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading invoices...</div>
          ) : error ? (
            <div style={{ color: 'var(--error)' }}>{error}</div>
          ) : invoices.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No invoices found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {invoices.map(invoice => (
                <div
                  key={invoice.id}
                  onClick={() => handleSelectInvoice(invoice.id)}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    cursor: 'pointer',
                    borderLeft: selectedInvoice?.id === invoice.id ? '4px solid var(--primary)' : '1px solid var(--panel-border)',
                    background: selectedInvoice?.id === invoice.id ? 'rgba(99,102,241,0.06)' : 'var(--panel-bg)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <h4 style={{ fontSize: '0.975rem', fontWeight: '600' }}>{invoice.invoiceNumber}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      PO Ref: {invoice.purchaseOrder?.poNumber}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Amount: ₹{parseFloat(invoice.totalAmount).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className={`status-pill ${invoice.status}`}>{invoice.status}</span>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Printable Invoice sheet */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>Invoice Document Workspace</h3>

          {invoiceDetailLoading ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading invoice details...</div>
          ) : !selectedInvoice ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>
              Select an Invoice from the registry to view, print, or dispatch via email.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Actions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem' }}>
                <button onClick={handlePrint} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  <Printer size={14} /> Print
                </button>
                <button onClick={() => { setShowEmailModal(true); setEmailResult(null); }} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  <Mail size={14} /> Email Invoice
                </button>

                {/* Manager / Admin Payment Trigger */}
                {(user.role === 'admin' || user.role === 'manager') && selectedInvoice.status === 'sent' && (
                  <button
                    onClick={handlePayInvoice}
                    disabled={payLoading}
                    className="btn btn-success"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    <DollarSign size={14} /> Mark as Paid
                  </button>
                )}
              </div>

              {/* Printable Invoice Sheet */}
              <div className="doc-sheet">
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #10b981', paddingBottom: '1rem', marginBottom: '2rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', textTransform: 'uppercase', color: '#10b981' }}>Tax Invoice</h2>
                    <div style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '4px' }}>Invoice ID: {selectedInvoice.invoiceNumber}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#4b5563' }}>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: '#111827' }}>
                      {selectedInvoice.vendor?.companyName}
                    </div>
                    <div>GSTIN: {selectedInvoice.vendor?.gstNumber}</div>
                    <div>Phone: {selectedInvoice.vendor?.phone}</div>
                    <div>Date: {selectedInvoice.invoiceDate}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', fontSize: '0.85rem', marginBottom: '2rem' }}>
                  <div>
                    <span style={{ color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Billed To:</span>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#111827', marginTop: '4px' }}>
                      VendorBridge ERP Organization
                    </div>
                    <div>Procurement & Finance Department</div>
                    <div>Purchase Ref: {selectedInvoice.purchaseOrder?.poNumber}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Reference Project:</span>
                    <div style={{ fontWeight: '700', color: '#111827', marginTop: '4px' }}>
                      {selectedInvoice.purchaseOrder?.rfq?.title}
                    </div>
                  </div>
                </div>

                {/* Calculations Table */}
                <table className="doc-sheet-table">
                  <thead>
                    <tr>
                      <th>Line Item Details</th>
                      <th style={{ textAlign: 'right' }}>Subtotal (INR)</th>
                      <th style={{ textAlign: 'right' }}>GST (18%)</th>
                      <th style={{ textAlign: 'right' }}>Gross Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: '500' }}>Procured items delivery as per PO: {selectedInvoice.purchaseOrder?.poNumber}</td>
                      <td style={{ textAlign: 'right' }}>₹{parseFloat(selectedInvoice.subtotal).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right' }}>₹{parseFloat(selectedInvoice.taxAmount).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{parseFloat(selectedInvoice.totalAmount).toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Payment State Footer */}
                <div style={{ marginTop: '3rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <div>
                    <div>Status: <span style={{ textTransform: 'uppercase', fontWeight: '700', color: selectedInvoice.status === 'paid' ? '#10b981' : '#f59e0b' }}>{selectedInvoice.status}</span></div>
                    <div>Authorized Date: {selectedInvoice.invoiceDate}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ height: '30px', borderBottom: '1px solid #6b7280', width: '120px', marginLeft: 'auto' }}></div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Billed Representative Signature</div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Email Dispatch Overlay */}
      {showEmailModal && selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '450px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1rem' }}>Dispatch Invoice via Email</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Send a copy of Tax Invoice <strong>{selectedInvoice.invoiceNumber}</strong> directly to your client or manager.
            </p>

            {emailResult && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--success-glow)', border: '1px solid var(--success)', borderRadius: '8px', color: 'var(--success)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <p><strong>Success!</strong> Invoice email routed successfully.</p>
                {emailResult.mocked && (
                  <p style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
                    (Development SMTP used: preview output logged to console)
                  </p>
                )}
                {emailResult.previewUrl && (
                  <a href={emailResult.previewUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontWeight: '600', marginTop: '6px', fontSize: '0.8rem' }}>
                     View Ethereal Email Preview <ChevronRight size={12} />
                  </a>
                )}
              </div>
            )}

            <form onSubmit={handleSendEmail}>
              <div className="form-group">
                <label className="form-label">Recipient Email Address</label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="form-control"
                  placeholder="recipient@company.com"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setShowEmailModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={emailLoading}>
                  <Send size={14} /> {emailLoading ? 'Dispatching...' : 'Send Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
