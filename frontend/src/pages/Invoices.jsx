import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  Printer, Mail, DollarSign, ChevronRight, Send,
  CheckCircle2, Scan, X, Package, AlertTriangle, ShieldCheck, Download
} from 'lucide-react';

// ── Barcode Visual Component ──────────────────────────────────────────────────
function BarcodeDisplay({ barcodeStr }) {
  // Generate deterministic bar pattern from the string hash
  const bars = [];
  let hash = 0;
  for (let i = 0; i < barcodeStr.length; i++) {
    hash = ((hash << 5) - hash + barcodeStr.charCodeAt(i)) | 0;
  }
  const seed = Math.abs(hash);

  for (let i = 0; i < 72; i++) {
    const pseudo = ((seed * (i + 1) * 6364136223846793005 + 1442695040888963407) >>> 0) % 100;
    const wide = pseudo < 30;
    bars.push(
      <div
        key={i}
        style={{
          width: wide ? '3px' : '1.5px',
          height: i % 7 === 0 ? '64px' : '52px',
          background: '#111',
          flexShrink: 0
        }}
      />
    );
    bars.push(<div key={`g${i}`} style={{ width: pseudo < 50 ? '2px' : '1px', flexShrink: 0 }} />);
  }

  const label = (() => {
    try { return JSON.parse(barcodeStr).INVOICE_NO; } catch { return 'BARCODE'; }
  })();

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, height: '68px' }}>
        {bars}
      </div>
      <div style={{ marginTop: '8px', fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: '3px', color: '#374151' }}>
        {label}
      </div>
    </div>
  );
}

// ── Scanner Modal ─────────────────────────────────────────────────────────────
function ScannerModal({ invoices, onClose }) {
  const [scanTarget, setScanTarget] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const scanLineRef = useRef(null);

  const handleScan = () => {
    if (!scanTarget) return;
    setScanning(true);
    setScanResult(null);
    setTimeout(() => {
      const inv = invoices.find(i => String(i.id) === String(scanTarget));
      if (!inv || !inv.barcode) {
        setScanResult({ error: 'Barcode not found or invoice not yet approved.' });
      } else {
        try {
          setScanResult({ data: JSON.parse(inv.barcode), raw: inv });
        } catch {
          setScanResult({ error: 'Failed to parse barcode data.' });
        }
      }
      setScanning(false);
    }, 1200);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content glass-panel" style={{ maxWidth: '560px', width: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scan size={18} style={{ color: 'var(--primary)' }} /> Delivery Barcode Scanner
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Simulated Camera Viewfinder */}
        <div style={{ position: 'relative', width: '100%', height: '140px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Corner brackets */}
          {[['0','0'],['0','auto'],['auto','0'],['auto','auto']].map(([t,r], idx) => (
            <div key={idx} style={{
              position: 'absolute', top: t === '0' ? '12px' : 'auto', bottom: t === 'auto' ? '12px' : 'auto',
              left: r === '0' ? '12px' : 'auto', right: r === 'auto' ? '12px' : 'auto',
              width: '20px', height: '20px',
              borderTop: t === '0' ? '3px solid #6366f1' : 'none',
              borderBottom: t === 'auto' ? '3px solid #6366f1' : 'none',
              borderLeft: r === '0' ? '3px solid #6366f1' : 'none',
              borderRight: r === 'auto' ? '3px solid #6366f1' : 'none',
            }} />
          ))}
          {/* Scan line */}
          <div style={{
            position: 'absolute', left: '16px', right: '16px', height: '2px',
            background: 'linear-gradient(90deg, transparent, #ef4444, transparent)',
            animation: 'scanLine 1.5s ease-in-out infinite',
            boxShadow: '0 0 8px #ef4444'
          }} />
          <div style={{ color: '#64748b', fontSize: '0.8rem', userSelect: 'none' }}>Simulated Camera Feed</div>
        </div>

        {/* Scan selector */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <select
            value={scanTarget}
            onChange={e => { setScanTarget(e.target.value); setScanResult(null); }}
            className="form-control"
            style={{ flex: 1, fontSize: '0.85rem' }}
          >
            <option value="">— Select Invoice Barcode to Scan —</option>
            {invoices.filter(i => i.status === 'approved' && i.barcode).map(i => (
              <option key={i.id} value={i.id}>{i.invoiceNumber} — {i.vendor?.companyName || i.purchaseOrder?.rfq?.title}</option>
            ))}
          </select>
          <button
            onClick={handleScan}
            disabled={!scanTarget || scanning}
            className="btn btn-primary"
            style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', padding: '0 1rem' }}
          >
            {scanning ? 'Scanning...' : <><Scan size={14} /> Scan</>}
          </button>
        </div>

        {/* Scan Result */}
        {scanResult?.error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '1rem', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /> {scanResult.error}
          </div>
        )}

        {scanResult?.data && (
          <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '12px', overflow: 'hidden' }}>
            {/* Gate pass header */}
            <div style={{ background: 'linear-gradient(90deg, #059669, #10b981)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={22} color="#fff" />
              <div>
                <div style={{ color: '#fff', fontWeight: '800', fontSize: '1rem', letterSpacing: '0.5px' }}>GATE PASS APPROVED</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem' }}>VendorBridge Delivery Clearance</div>
              </div>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Vendor */}
              <Section title="🏢 Vendor Details">
                <Row label="Company" value={scanResult.data.VENDOR} />
                <Row label="GSTIN" value={scanResult.data.GSTIN} />
                <Row label="Phone" value={scanResult.data.PHONE} />
                <Row label="Contact" value={scanResult.data.CONTACT} />
              </Section>

              {/* Product */}
              <Section title="📦 Product / Project">
                <Row label="Project" value={scanResult.data.PROJECT} />
                <Row label="PO Number" value={scanResult.data.PO_NUMBER} />
                <Row label="Items Dispatching" value={`${scanResult.data.ITEMS_SELECTED} of ${scanResult.data.TOTAL_QTY} units`} />
              </Section>

              {/* Invoice */}
              <Section title="🧾 Invoice Details">
                <Row label="Invoice No" value={scanResult.data.INVOICE_NO} />
                <Row label="Invoice Date" value={scanResult.data.INVOICE_DATE} />
                <Row label="Subtotal" value={`₹${parseFloat(scanResult.data.SUBTOTAL).toLocaleString('en-IN')}`} />
                <Row label="GST (18%)" value={`₹${parseFloat(scanResult.data.TAX).toLocaleString('en-IN')}`} />
                <Row label="Total" value={`₹${parseFloat(scanResult.data.TOTAL).toLocaleString('en-IN')}`} highlight />
              </Section>

              {/* DC */}
              <Section title="🚚 Delivery Challan">
                <Row label="DC Number" value={scanResult.data.DC_NO} />
                <Row label="DC Date" value={scanResult.data.DC_DATE} />
              </Section>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }}>
                Scanned at {new Date().toLocaleString()} &nbsp;|&nbsp; VendorBridge ERP Gate Scanner
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.55rem 0.9rem', borderBottom: '1px solid var(--panel-border)' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: highlight ? '800' : '600', color: highlight ? '#10b981' : 'var(--text-main)' }}>{value}</span>
    </div>
  );
}

// ── Main Invoices Component ───────────────────────────────────────────────────
export default function Invoices({ user }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetailLoading, setInvoiceDetailLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResult, setEmailResult] = useState(null);

  const [showScanner, setShowScanner] = useState(false);

  const handleDownloadPDF = () => {
    const element = document.querySelector('.doc-sheet');
    if (!element) return;
    
    const opt = {
      margin: 0.5,
      filename: `Invoice_${selectedInvoice?.invoiceNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    if (window.html2pdf) {
      window.html2pdf().set(opt).from(element).save();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        window.html2pdf().set(opt).from(element).save();
      };
      document.body.appendChild(script);
    }
  };

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

  useEffect(() => { fetchInvoices(); }, []);

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

  const handleApproveInvoice = async () => {
    setApproveLoading(true);
    try {
      const res = await api.put(`/invoices/${selectedInvoice.id}/approve`);
      alert(`Invoice ${selectedInvoice.invoiceNumber} approved! Gate pass barcode generated and confirmation email sent.`);
      handleSelectInvoice(selectedInvoice.id);
      fetchInvoices();
    } catch (err) {
      alert(err.message || 'Failed to approve invoice');
    } finally {
      setApproveLoading(false);
    }
  };

  const handlePayInvoice = async () => {
    setPayLoading(true);
    try {
      await api.put(`/invoices/${selectedInvoice.id}/pay`);
      alert(`Invoice ${selectedInvoice.invoiceNumber} marked as paid.`);
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

  const statusColor = (s) => {
    if (s === 'approved') return '#10b981';
    if (s === 'paid') return '#6366f1';
    if (s === 'pending_approval') return '#f59e0b';
    return '#94a3b8';
  };

  const parsedItems = (() => {
    try { return JSON.parse(selectedInvoice?.selectedItems || '[]'); } catch { return []; }
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Invoices &amp; Billing</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Review, approve, and track delivery invoices. Scan barcodes at delivery gates.</p>
        </div>
        <button
          onClick={() => setShowScanner(true)}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.55rem 1rem' }}
        >
          <Scan size={16} /> Gate Scanner
        </button>
      </div>

      <div className="dashboard-grid">
        {/* Left: Invoice List */}
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
                    padding: '1.25rem', cursor: 'pointer',
                    borderLeft: selectedInvoice?.id === invoice.id ? '4px solid var(--primary)' : '1px solid var(--panel-border)',
                    background: selectedInvoice?.id === invoice.id ? 'rgba(99,102,241,0.06)' : 'var(--panel-bg)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <h4 style={{ fontSize: '0.975rem', fontWeight: '600' }}>{invoice.invoiceNumber}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>PO: {invoice.purchaseOrder?.poNumber}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{parseFloat(invoice.totalAmount).toLocaleString('en-IN')}</span>
                    {invoice.dcNumber && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DC: {invoice.dcNumber}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className={`status-pill ${invoice.status}`}>{invoice.status.replace('_', ' ')}</span>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Invoice Detail */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>Invoice Document Workspace</h3>

          {invoiceDetailLoading ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading invoice details...</div>
          ) : !selectedInvoice ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>
              Select an Invoice to view, approve, or dispatch via email.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Action Bar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem' }}>
                <button onClick={() => window.print()} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  <Printer size={14} /> Print
                </button>
                <button onClick={handleDownloadPDF} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  <Download size={14} /> Download PDF
                </button>
                <button onClick={() => { setShowEmailModal(true); setEmailResult(null); }} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  <Mail size={14} /> Email Invoice
                </button>

                {/* Procurement Officer / Admin → Approve */}
                {(user.role === 'procurement' || user.role === 'admin') && selectedInvoice.status === 'pending_approval' && (
                  <button onClick={handleApproveInvoice} disabled={approveLoading} className="btn btn-success" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                    <CheckCircle2 size={14} /> {approveLoading ? 'Approving...' : 'Approve Invoice & Issue Barcode'}
                  </button>
                )}

                {/* Manager / Admin → Pay */}
                {(user.role === 'admin' || user.role === 'manager') && selectedInvoice.status === 'approved' && (
                  <button onClick={handlePayInvoice} disabled={payLoading} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                    <DollarSign size={14} /> {payLoading ? 'Processing...' : 'Mark as Paid'}
                  </button>
                )}

                {/* Scan barcode button */}
                {selectedInvoice.barcode && (
                  <button onClick={() => setShowScanner(true)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: '#10b981', color: '#10b981' }}>
                    <Scan size={14} /> Scan Barcode
                  </button>
                )}
              </div>

              {/* Pending Approval Banner */}
              {selectedInvoice.status === 'pending_approval' && (
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '8px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#f59e0b' }}>
                  <AlertTriangle size={16} />
                  This invoice is <strong>awaiting Procurement Officer approval</strong>. Once approved, a gate pass barcode will be issued.
                </div>
              )}

              {/* Invoice Doc Sheet */}
              <div className="doc-sheet">
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #10b981', paddingBottom: '1rem', marginBottom: '2rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', textTransform: 'uppercase', color: '#10b981' }}>Tax Invoice</h2>
                    <div style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '4px' }}>Invoice ID: {selectedInvoice.invoiceNumber}</div>
                    {selectedInvoice.dcNumber && <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px' }}>DC No: {selectedInvoice.dcNumber} &nbsp;|&nbsp; DC Date: {selectedInvoice.dcDate}</div>}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#4b5563' }}>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: '#111827' }}>{selectedInvoice.vendor?.companyName}</div>
                    <div>GSTIN: {selectedInvoice.vendor?.gstNumber}</div>
                    <div>Phone: {selectedInvoice.vendor?.phone}</div>
                    <div>Date: {selectedInvoice.invoiceDate}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', fontSize: '0.85rem', marginBottom: '2rem' }}>
                  <div>
                    <span style={{ color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Billed To:</span>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#111827', marginTop: '4px' }}>VendorBridge ERP Organization</div>
                    <div>Procurement &amp; Finance Department</div>
                    <div>Purchase Ref: {selectedInvoice.purchaseOrder?.poNumber}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Project:</span>
                    <div style={{ fontWeight: '700', color: '#111827', marginTop: '4px' }}>{selectedInvoice.purchaseOrder?.rfq?.title}</div>
                    <div style={{ color: '#6b7280', marginTop: '4px', fontSize: '0.82rem' }}>
                      Items in this invoice: <strong style={{ color: '#111827' }}>{selectedInvoice.invoicedQuantity} unit(s)</strong>
                    </div>
                  </div>
                </div>

                {/* Selected Items */}
                {parsedItems.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={12} /> Items Covered in This Invoice
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {parsedItems.map((item, i) => (
                        <span key={i} style={{ background: '#ede9fe', color: '#4f46e5', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: '500' }}>{item}</span>
                      ))}
                    </div>
                  </div>
                )}

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
                      <td style={{ fontWeight: '500' }}>Delivery of {selectedInvoice.invoicedQuantity} unit(s) per PO: {selectedInvoice.purchaseOrder?.poNumber}</td>
                      <td style={{ textAlign: 'right' }}>₹{parseFloat(selectedInvoice.subtotal).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right' }}>₹{parseFloat(selectedInvoice.taxAmount).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{parseFloat(selectedInvoice.totalAmount).toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ marginTop: '3rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <div>
                    <div>Status: <span style={{ textTransform: 'uppercase', fontWeight: '700', color: statusColor(selectedInvoice.status) }}>{selectedInvoice.status.replace('_', ' ')}</span></div>
                    <div>Authorized Date: {selectedInvoice.invoiceDate}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ height: '30px', borderBottom: '1px solid #6b7280', width: '120px', marginLeft: 'auto' }}></div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Vendor Representative Signature</div>
                  </div>
                </div>
              </div>

              {/* Barcode Panel */}
              {selectedInvoice.barcode && (
                <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(5,150,105,0.03))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '700', color: '#059669' }}>
                    <ShieldCheck size={16} /> Gate Pass Barcode — Show this at delivery
                  </div>
                  <BarcodeDisplay barcodeStr={selectedInvoice.barcode} />
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    This barcode contains all invoice, DC, vendor, and product details. Scan using the Gate Scanner.
                  </div>
                  <button onClick={() => setShowScanner(true)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', borderColor: '#10b981', color: '#10b981' }}>
                    <Scan size={13} /> Open Scanner to Verify
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '450px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1rem' }}>Dispatch Invoice via Email</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Send a copy of <strong>{selectedInvoice.invoiceNumber}</strong> to your client or manager.
            </p>
            {emailResult && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--success-glow)', border: '1px solid var(--success)', borderRadius: '8px', color: 'var(--success)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <p><strong>Success!</strong> Invoice email routed successfully.</p>
                {emailResult.previewUrl && (
                  <a href={emailResult.previewUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.8rem' }}>
                    View Ethereal Preview <ChevronRight size={12} style={{ verticalAlign: 'middle' }} />
                  </a>
                )}
              </div>
            )}
            <form onSubmit={handleSendEmail}>
              <div className="form-group">
                <label className="form-label">Recipient Email Address</label>
                <input type="email" value={emailAddress} onChange={e => setEmailAddress(e.target.value)} className="form-control" placeholder="recipient@company.com" required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setShowEmailModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={emailLoading}>
                  <Send size={14} /> {emailLoading ? 'Dispatching...' : 'Send Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gate Scanner Modal */}
      {showScanner && (
        <ScannerModal invoices={invoices} onClose={() => setShowScanner(false)} />
      )}

      {/* Scan line keyframe */}
      <style>{`
        @keyframes scanLine {
          0%   { top: 20%; }
          50%  { top: 75%; }
          100% { top: 20%; }
        }
      `}</style>
    </div>
  );
}
