import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  ClipboardList, Printer, CheckCircle2, XCircle,
  FilePlus, ChevronRight, Package, X, Hash, Calendar
} from 'lucide-react';

export default function PurchaseOrders({ user }) {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [approvedQuotes, setApprovedQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(false);

  const [selectedPo, setSelectedPo] = useState(null);
  const [poDetailLoading, setPoDetailLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // Invoice generation modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dcNumber: '',
    dcDate: new Date().toISOString().split('T')[0],
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);

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
    } catch {
      setApprovedQuotes([]);
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
      alert(err.message || 'Failed to fetch PO details');
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
      alert(err.message || 'Failed to update PO status');
    } finally {
      setStatusLoading(false);
    }
  };

  // Open the invoice modal — reset form state
  const openInvoiceModal = () => {
    const qty = selectedPo?.rfq?.quantity || 1;
    setSelectedItems([]);
    setInvoiceForm({
      invoiceNumber: `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      dcNumber: '',
      dcDate: new Date().toISOString().split('T')[0],
    });
    setShowInvoiceModal(true);
  };

  const toggleItem = (idx) => {
    setSelectedItems(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const toggleAll = () => {
    const qty = selectedPo?.rfq?.quantity || 1;
    const all = Array.from({ length: qty }, (_, i) => i);
    setSelectedItems(prev => prev.length === qty ? [] : all);
  };

  const handleSubmitInvoice = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) return alert('Please select at least one item to invoice.');
    if (!invoiceForm.invoiceNumber.trim()) return alert('Invoice number is required.');
    if (!invoiceForm.invoiceDate) return alert('Invoice date is required.');

    setInvoiceSubmitting(true);
    try {
      const payload = {
        poId: selectedPo.id,
        invoiceNumber: invoiceForm.invoiceNumber.trim(),
        invoiceDate: invoiceForm.invoiceDate,
        dcNumber: invoiceForm.dcNumber.trim() || null,
        dcDate: invoiceForm.dcDate || null,
        selectedItems: selectedItems.map(i => `Item Unit #${i + 1}`)
      };
      const result = await api.post('/invoices/generate', payload);
      alert(`Invoice ${result.invoiceNumber} submitted for ${selectedItems.length} item(s). Awaiting Procurement Officer approval.`);
      setShowInvoiceModal(false);
      handleSelectPo(selectedPo.id);
      fetchPOs();
    } catch (err) {
      alert(err.message || 'Failed to submit invoice');
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  const unitPrice = selectedPo
    ? parseFloat(selectedPo.totalAmount) / (selectedPo.rfq?.quantity || 1)
    : 0;
  const previewSubtotal = unitPrice * selectedItems.length;
  const previewTotal = previewSubtotal * 1.18;

  const qty = selectedPo?.rfq?.quantity || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Purchase Orders</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage purchase agreements and submit delivery invoices.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left: PO List */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(user.role === 'procurement' || user.role === 'admin') && (
            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1.5rem' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ClipboardList size={16} /> Approved Quotes Pending PO ({approvedQuotes.length})
              </h4>
              {quotesLoading ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading...</div>
              ) : approvedQuotes.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No quotations awaiting PO release.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {approvedQuotes.map(quote => (
                    <div key={quote.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '65%' }}>
                        <span style={{ fontWeight: '600' }}>{quote.vendor?.companyName}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{quote.rfq?.title}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: '600' }}>₹{parseFloat(quote.price).toLocaleString('en-IN')}</span>
                      </div>
                      <button onClick={() => handleGeneratePOManually(quote.id)} className="btn btn-primary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}>
                        Generate PO
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>PO Registry</h3>

          {loading ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
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
                    padding: '1.25rem', cursor: 'pointer',
                    borderLeft: selectedPo?.id === po.id ? '4px solid var(--primary)' : '1px solid var(--panel-border)',
                    background: selectedPo?.id === po.id ? 'rgba(99,102,241,0.06)' : 'var(--panel-bg)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <h4 style={{ fontSize: '0.975rem', fontWeight: '600' }}>{po.poNumber}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{po.rfq?.title || 'Unknown Project'}</span>
                    {user.role !== 'vendor' && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Vendor: {po.vendor?.companyName}</span>
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

        {/* Right: PO Detail */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>PO Document Workspace</h3>

          {poDetailLoading ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading PO details...</div>
          ) : !selectedPo ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>
              Select a Purchase Order from the list to view or generate an invoice.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem' }}>
                <button onClick={() => window.print()} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  <Printer size={14} /> Print Document
                </button>

                {user.role === 'vendor' && selectedPo.status === 'approved' && (
                  <>
                    <button onClick={() => handlePOStatusUpdate('accepted')} disabled={statusLoading} className="btn btn-success" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                      <CheckCircle2 size={14} /> Accept PO
                    </button>
                    <button onClick={() => handlePOStatusUpdate('rejected')} disabled={statusLoading} className="btn btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                      <XCircle size={14} /> Decline PO
                    </button>
                  </>
                )}

                {(selectedPo.status === 'accepted' || selectedPo.status === 'approved') && (
                  <button onClick={openInvoiceModal} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                    <FilePlus size={14} /> Generate Invoice / DC
                  </button>
                )}
              </div>

              {/* PO Document */}
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
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#111827', marginTop: '4px' }}>{selectedPo.vendor?.companyName}</div>
                    <div>Contact: {selectedPo.vendor?.contactPerson}</div>
                    <div>GSTIN: {selectedPo.vendor?.gstNumber}</div>
                    <div>Phone: {selectedPo.vendor?.phone}</div>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Project Details:</span>
                    <div style={{ fontWeight: '700', color: '#111827', marginTop: '4px' }}>{selectedPo.rfq?.title}</div>
                    <div style={{ color: '#4b5563', marginTop: '2px' }}>{(() => { try { return JSON.parse(selectedPo.rfq?.productDetails || '{}').description; } catch { return ''; }})()}</div>
                    <div style={{ marginTop: '6px', color: '#6b7280' }}>Total Qty: <strong style={{ color: '#111827' }}>{selectedPo.rfq?.quantity} units</strong></div>
                  </div>
                </div>

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
                      <td style={{ fontWeight: '500' }}>Goods/Services per specifications</td>
                      <td style={{ textAlign: 'right' }}>{selectedPo.rfq?.quantity}</td>
                      <td style={{ textAlign: 'right' }}>₹{(parseFloat(selectedPo.totalAmount) / (selectedPo.rfq?.quantity || 1)).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{parseFloat(selectedPo.totalAmount).toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ marginTop: '3rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <div>
                    <div>Status: <span style={{ textTransform: 'uppercase', fontWeight: '700', color: selectedPo.status === 'accepted' ? '#10b981' : '#f59e0b' }}>{selectedPo.status}</span></div>
                    {selectedPo.invoice && (
                      <div style={{ color: '#10b981', fontWeight: '600', marginTop: '4px' }}>✓ Invoice: {selectedPo.invoice.invoiceNumber}</div>
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

      {/* ── Invoice Generation Modal ── */}
      {showInvoiceModal && selectedPo && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '640px', width: '95vw', maxHeight: '92vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', margin: 0 }}>
                <FilePlus size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                Generate Invoice &amp; Delivery Challan
              </h2>
              <button onClick={() => setShowInvoiceModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--primary)' }}>{selectedPo.poNumber}</strong> — {selectedPo.rfq?.title}<br />
              Vendor: <strong>{selectedPo.vendor?.companyName}</strong> &nbsp;|&nbsp; Total PO Qty: <strong>{qty} units</strong>
            </div>

            <form onSubmit={handleSubmitInvoice}>
              {/* ── Step 1: Select Items ── */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package size={15} /> Select Items to Invoice
                  </label>
                  <button type="button" onClick={toggleAll} style={{ fontSize: '0.75rem', background: 'none', border: '1px solid var(--panel-border)', borderRadius: '6px', padding: '0.25rem 0.6rem', cursor: 'pointer', color: 'var(--primary)' }}>
                    {selectedItems.length === qty ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', padding: '0.25rem' }}>
                  {Array.from({ length: qty }, (_, i) => (
                    <label
                      key={i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 0.65rem',
                        border: `1px solid ${selectedItems.includes(i) ? 'var(--primary)' : 'var(--panel-border)'}`,
                        borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem',
                        background: selectedItems.includes(i) ? 'rgba(99,102,241,0.1)' : 'transparent',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(i)}
                        onChange={() => toggleItem(i)}
                        style={{ accentColor: 'var(--primary)', width: '14px', height: '14px' }}
                      />
                      <span>Unit #{i + 1}</span>
                    </label>
                  ))}
                </div>

                {selectedItems.length > 0 && (
                  <div style={{ marginTop: '0.75rem', padding: '0.6rem 1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', fontSize: '0.82rem', color: '#10b981' }}>
                    ✓ <strong>{selectedItems.length}</strong> of <strong>{qty}</strong> units selected &nbsp;|&nbsp;
                    Subtotal: <strong>₹{previewSubtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong> &nbsp;|&nbsp;
                    Total (18% GST): <strong>₹{previewTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                  </div>
                )}
              </div>

              {/* ── Step 2: Invoice Details ── */}
              <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Hash size={14} /> Invoice Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Invoice Number *</label>
                    <input type="text" className="form-control" value={invoiceForm.invoiceNumber}
                      onChange={e => setInvoiceForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                      placeholder="INV-2026-0001" required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Invoice Date *</label>
                    <input type="date" className="form-control" value={invoiceForm.invoiceDate}
                      onChange={e => setInvoiceForm(f => ({ ...f, invoiceDate: e.target.value }))}
                      required />
                  </div>
                </div>
              </div>

              {/* ── Step 3: DC Details ── */}
              <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} /> Delivery Challan Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>DC Number</label>
                    <input type="text" className="form-control" value={invoiceForm.dcNumber}
                      onChange={e => setInvoiceForm(f => ({ ...f, dcNumber: e.target.value }))}
                      placeholder="DC-2026-0001" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>DC Date</label>
                    <input type="date" className="form-control" value={invoiceForm.dcDate}
                      onChange={e => setInvoiceForm(f => ({ ...f, dcDate: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowInvoiceModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={invoiceSubmitting || selectedItems.length === 0}>
                  <FilePlus size={14} />
                  {invoiceSubmitting ? 'Submitting...' : `Submit Invoice (${selectedItems.length} items)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
