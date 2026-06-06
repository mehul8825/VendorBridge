import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ClipboardList, Printer, CheckCircle2, XCircle, FilePlus, ChevronRight, Eye } from 'lucide-react';

export default function PurchaseOrders({ user }) {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pending PO quotes state
  const [approvedQuotes, setApprovedQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Selected PO for detail/print view
  const [selectedPo, setSelectedPo] = useState(null);
  const [poDetailLoading, setPoDetailLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [invoiceGenerating, setInvoiceGenerating] = useState(false);

  const fetchPOs = async () => {
    try {
      const data = await api.get('/pos');
      setPos(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch Purchase Orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedQuotes = async () => {
    if (user.role !== 'procurement' && user.role !== 'admin') return;
    setQuotesLoading(true);
    try {
      const data = await api.get('/quotations/pending-po');
      setApprovedQuotes(data);
    } catch (err) {
      console.log('Failed to fetch pending PO quotes:', err);
    } finally {
      setQuotesLoading(false);
    }
  };

  const handleGeneratePOManually = async (quotationId) => {
    try {
      const po = await api.post('/pos', { quotationId });
      alert(`Purchase Order ${po.poNumber} generated successfully!`);
      fetchPOs();
      fetchApprovedQuotes();
    } catch (err) {
      alert(err.message || 'Failed to generate Purchase Order');
    }
  };

  useEffect(() => {
    fetchPOs();
    fetchApprovedQuotes();
  }, []);

  const handleSelectPo = async (id) => {
    setPoDetailLoading(true);
    try {
      const data = await api.get(`/pos/${id}`);
      setSelectedPo(data);
    } catch (err) {
      alert(err.message || 'Failed to fetch Purchase Order details');
    } finally {
      setPoDetailLoading(false);
    }
  };

  const handlePOStatusUpdate = async (status) => {
    setStatusLoading(true);
    try {
      await api.put(`/pos/${selectedPo.id}/status`, { status });
      alert(`Purchase Order ${selectedPo.poNumber} has been ${status}.`);
      handleSelectPo(selectedPo.id);
      fetchPOs();
    } catch (err) {
      alert(err.message || 'Failed to update Purchase Order status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setInvoiceGenerating(true);
    try {
      const result = await api.post('/invoices/generate', { poId: selectedPo.id });
      alert(`Invoice ${result.invoiceNumber} generated successfully!`);
      // Update selected PO view
      handleSelectPo(selectedPo.id);
      fetchPOs();
    } catch (err) {
      alert(err.message || 'Failed to generate invoice');
    } finally {
      setInvoiceGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Purchase Orders</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Generate legal purchase agreements and transition them to billing invoices.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Side: PO Feed */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Approved Quotations awaiting PO generation */}
          {(user.role === 'procurement' || user.role === 'admin') && (
            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1.5rem' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ClipboardList size={16} /> Approved Quotes Pending PO Release ({approvedQuotes.length})
              </h4>
              {quotesLoading ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Checking approved list...</div>
              ) : approvedQuotes.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No quotations awaiting PO release.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {approvedQuotes.map(quote => (
                    <div key={quote.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '65%' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quote.vendor?.companyName}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Project: {quote.rfq?.title}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: '600' }}>Value: ₹{parseFloat(quote.price).toLocaleString('en-IN')}</span>
                      </div>
                      <button
                        onClick={() => handleGeneratePOManually(quote.id)}
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
                      >
                        Generate PO
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>Release PO Registry</h3>
          
          {loading ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading PO registry...</div>
          ) : error ? (
            <div style={{ color: 'var(--error)' }}>{error}</div>
          ) : pos.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No Purchase Orders issued.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pos.map(po => (
                <div
                  key={po.id}
                  onClick={() => handleSelectPo(po.id)}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    cursor: 'pointer',
                    borderLeft: selectedPo?.id === po.id ? '4px solid var(--primary)' : '1px solid var(--panel-border)',
                    background: selectedPo?.id === po.id ? 'rgba(99,102,241,0.06)' : 'var(--panel-bg)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <h4 style={{ fontSize: '0.975rem', fontWeight: '600' }}>{po.poNumber}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Project: {po.rfq?.title || 'Unknown Project'}
                    </span>
                    {user.role !== 'vendor' && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                        Vendor: {po.vendor?.companyName}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className={`status-pill ${po.status}`}>{po.status}</span>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Details / Print Document */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>PO Document Workspace</h3>

          {poDetailLoading ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading PO details...</div>
          ) : !selectedPo ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>
              Select a Purchase Order to view, print, or generate invoices.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Document Actions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem' }}>
                <button onClick={handlePrint} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  <Printer size={14} /> Print Document
                </button>

                {/* Vendor Actions: Accept or Decline PO */}
                {user.role === 'vendor' && selectedPo.status === 'approved' && (
                  <>
                    <button
                      onClick={() => handlePOStatusUpdate('accepted')}
                      disabled={statusLoading}
                      className="btn btn-success"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                      <CheckCircle2 size={14} /> Accept PO
                    </button>
                    <button
                      onClick={() => handlePOStatusUpdate('rejected')}
                      disabled={statusLoading}
                      className="btn btn-danger"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                      <XCircle size={14} /> Decline PO
                    </button>
                  </>
                )}

                {/* Billing Action: Generate Invoice once accepted */}
                {(selectedPo.status === 'accepted' || selectedPo.status === 'approved') && !selectedPo.invoice && (
                  <button
                    onClick={handleGenerateInvoice}
                    disabled={invoiceGenerating}
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    <FilePlus size={14} /> Generate Invoice
                  </button>
                )}
              </div>

              {/* Printable Document Sheet */}
              <div className="doc-sheet">
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #4f46e5', paddingBottom: '1rem', marginBottom: '2rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', textTransform: 'uppercase', color: '#4f46e5' }}>Purchase Order</h2>
                    <div style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '4px' }}>Doc ID: {selectedPo.poNumber}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#4b5563' }}>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: '#111827' }}>VendorBridge ERP</div>
                    <div>Procurement Department</div>
                    <div>Date: {new Date(selectedPo.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', fontSize: '0.85rem', marginBottom: '2rem' }}>
                  <div>
                    <span style={{ color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Issued To:</span>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#111827', marginTop: '4px' }}>
                      {selectedPo.vendor?.companyName}
                    </div>
                    <div>Contact: {selectedPo.vendor?.contactPerson}</div>
                    <div>GSTIN: {selectedPo.vendor?.gstNumber}</div>
                    <div>Phone: {selectedPo.vendor?.phone}</div>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Project Details:</span>
                    <div style={{ fontWeight: '700', color: '#111827', marginTop: '4px' }}>
                      {selectedPo.rfq?.title}
                    </div>
                    <div style={{ color: '#4b5563', marginTop: '2px' }}>
                      {JSON.parse(selectedPo.rfq?.productDetails || '{}').description}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <table className="doc-sheet-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Unit Price (INR)</th>
                      <th style={{ textAlign: 'right' }}>Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: '500' }}>Procurement of Goods/Services as per specifications</td>
                      <td style={{ textAlign: 'right' }}>{selectedPo.rfq?.quantity}</td>
                      <td style={{ textAlign: 'right' }}>
                        ₹{(parseFloat(selectedPo.totalAmount) / (selectedPo.rfq?.quantity || 1)).toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '700' }}>
                        ₹{parseFloat(selectedPo.totalAmount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Sign Off Footnote */}
                <div style={{ marginTop: '3rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <div>
                    <div>Status: <span style={{ textTransform: 'uppercase', fontWeight: '700', color: selectedPo.status === 'accepted' ? '#10b981' : '#f59e0b' }}>{selectedPo.status}</span></div>
                    {selectedPo.invoice && (
                      <div style={{ color: '#10b981', fontWeight: '600', marginTop: '4px' }}>✓ Invoice Generated: {selectedPo.invoice.invoiceNumber}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ height: '30px', borderBottom: '1px solid #6b7280', width: '120px', marginLeft: 'auto' }}></div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Authorized Signature</div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
