import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Clock, FileText, CheckCircle2, ChevronRight, Eye, Sparkles, Upload, X } from 'lucide-react';

export default function RFQs({ user, setActiveTab, setComparisonRfqId }) {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create RFQ Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('IT & Hardware');
  const [quantity, setQuantity] = useState(1);
  const [targetBudget, setTargetBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [allVendors, setAllVendors] = useState([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);

  // Selected RFQ detail view
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [rfqDetailLoading, setRfqDetailLoading] = useState(false);

  // Bidding states for Vendors
  const [bidPrice, setBidPrice] = useState('');
  const [bidDelivery, setBidDelivery] = useState('');
  const [bidNotes, setBidNotes] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [existingBid, setExistingBid] = useState(null);

  const fetchRfqs = async () => {
    try {
      const data = await api.get('/rfqs');
      setRfqs(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch RFQs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfqs();
    if (user.role === 'procurement' || user.role === 'admin') {
      // Load vendors list for RFQ assignments
      api.get('/vendors?status=approved').then(data => setAllVendors(data)).catch(err => console.log(err));
    }
  }, []);

  const handleSelectRfq = async (rfqId) => {
    setRfqDetailLoading(true);
    try {
      const data = await api.get(`/rfqs/${rfqId}`);
      setSelectedRfq(data);

      // Reset bidding states
      setBidPrice('');
      setBidDelivery('');
      setBidNotes('');
      setExistingBid(null);

      // If user is a vendor, check if they already submitted a bid
      if (user.role === 'vendor' && data.quotations) {
        const found = data.quotations.find(q => q.vendorId === data.assignments[0]?.vendorId); // Check my bid
        if (found) {
          setExistingBid(found);
          setBidPrice(found.price);
          setBidDelivery(found.deliveryDays);
          setBidNotes(found.notes || '');
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to retrieve RFQ details');
    } finally {
      setRfqDetailLoading(false);
    }
  };

  const handleCreateRfq = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const payload = {
        title,
        productDetails: JSON.stringify({ description, category }),
        quantity,
        targetBudget: parseFloat(targetBudget),
        deadline,
        assignedVendorIds: selectedVendorIds.length > 0 ? selectedVendorIds : null,
        attachments: attachments
      };

      await api.post('/rfqs', payload);
      setShowCreateModal(false);
      // Reset
      setTitle('');
      setDescription('');
      setTargetBudget('');
      setDeadline('');
      setSelectedVendorIds([]);
      setAttachments([]);
      
      fetchRfqs();
    } catch (err) {
      alert(err.message || 'Failed to publish RFQ');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    setBidLoading(true);
    try {
      if (existingBid) {
        // Edit bid
        const data = await api.put(`/quotations/${existingBid.id}`, {
          price: parseFloat(bidPrice),
          deliveryDays: parseInt(bidDelivery),
          notes: bidNotes
        });
        alert('Your quotation has been updated successfully.');
        setExistingBid(data);
      } else {
        // Create bid
        const data = await api.post('/quotations', {
          rfqId: selectedRfq.id,
          price: parseFloat(bidPrice),
          deliveryDays: parseInt(bidDelivery),
          notes: bidNotes
        });
        alert('Your quotation has been submitted successfully.');
        setExistingBid(data);
      }
      handleSelectRfq(selectedRfq.id);
    } catch (err) {
      alert(err.message || 'Failed to submit bid');
    } finally {
      setBidLoading(false);
    }
  };

  const toggleVendorSelection = (vendorId) => {
    if (selectedVendorIds.includes(vendorId)) {
      setSelectedVendorIds(prev => prev.filter(id => id !== vendorId));
    } else {
      setSelectedVendorIds(prev => [...prev, vendorId]);
    }
  };

  const handleAttachmentAdd = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const attachment = {
          name: file.name,
          size: file.size,
          type: file.type,
          data: evt.target.result, // Base64 data
          uploadedAt: new Date().toISOString()
        };
        setAttachments(prev => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = ''; // Reset file input
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>RFQs & Bidding Board</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Create procurement RFQ specifications, manage target budgets, and evaluate bids.</p>
        </div>

        {user.role === 'procurement' && (
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary glow-hover">
            <Plus size={16} /> Create RFQ Project
          </button>
        )}
      </div>

      <div className="dashboard-grid">
        {/* Left Side: RFQs Feed */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>Available RFQs Feed</h3>
          
          {loading ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading RFQ listings...</div>
          ) : error ? (
            <div style={{ color: 'var(--error)' }}>{error}</div>
          ) : rfqs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No RFQs active at this time.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {rfqs.map(rfq => {
                let rfqCat = 'General';
                try {
                  const details = JSON.parse(rfq.productDetails);
                  rfqCat = details.category || 'General';
                } catch (e) {}

                return (
                  <div
                    key={rfq.id}
                    onClick={() => handleSelectRfq(rfq.id)}
                    className="glass-panel"
                    style={{
                      padding: '1.25rem',
                      cursor: 'pointer',
                      borderLeft: selectedRfq?.id === rfq.id ? '4px solid var(--primary)' : '1px solid var(--panel-border)',
                      background: selectedRfq?.id === rfq.id ? 'rgba(99,102,241,0.06)' : 'var(--panel-bg)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>{rfqCat}</span>
                      <h4 style={{ fontSize: '0.975rem', fontWeight: '600' }}>{rfq.title}</h4>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Deadline: {rfq.deadline}</span>
                        <span>Budget: ₹{parseFloat(rfq.targetBudget).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`status-pill ${rfq.status}`}>{rfq.status}</span>
                      <ChevronRight size={18} color="var(--text-muted)" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Detail view & Bidding */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>RFQ Details Workspace</h3>

          {rfqDetailLoading ? (
            <div style={{ color: 'var(--text-secondary)' }}>Retrieving detail specs...</div>
          ) : !selectedRfq ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>
              Select an RFQ from the feed to view specifications, invitees, and manage quotations.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <span className={`status-pill ${selectedRfq.status}`} style={{ marginBottom: '0.5rem' }}>{selectedRfq.status}</span>
                <h2 style={{ fontSize: '1.35rem', fontFamily: 'var(--font-heading)' }}>{selectedRfq.title}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Issued by: {selectedRfq.creator?.name || 'System'}</p>
              </div>

              <div style={{ borderTop: '1px solid var(--panel-border)', borderBottom: '1px solid var(--panel-border)', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Product/Service Specifications:</strong>
                  <p style={{ fontSize: '0.9rem', marginTop: '4px', color: 'var(--text-main)' }}>
                    {JSON.parse(selectedRfq.productDetails).description}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Quantity:</span>
                    <div style={{ fontWeight: '600' }}>{selectedRfq.quantity}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Target Budget:</span>
                    <div style={{ fontWeight: '600' }}>₹{parseFloat(selectedRfq.targetBudget).toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Deadline:</span>
                    <div style={{ fontWeight: '600', color: 'var(--primary)' }}>{selectedRfq.deadline}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                    <div style={{ fontWeight: '600' }}><span className={`status-pill ${selectedRfq.status}`}>{selectedRfq.status}</span></div>
                  </div>
                </div>

                {/* Display Attachments if any */}
                {selectedRfq.attachments && selectedRfq.attachments.length > 0 && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--panel-border)' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.75rem' }}>
                      <FileText size={14} style={{ display: 'inline', marginRight: '4px' }} />
                      Attachments ({selectedRfq.attachments.length})
                    </strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedRfq.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.data || att.url}
                          download={att.name}
                          style={{
                            padding: '0.75rem',
                            background: 'rgba(99,102,241,0.05)',
                            border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'}
                        >
                          <FileText size={14} />
                          {att.name} ({att.size ? `${(att.size / 1024).toFixed(2)} KB` : 'size unknown'})
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* View comparisons if procurement/admin/manager */}
              {user.role !== 'vendor' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '600' }}>Submitted Quotations ({selectedRfq.quotations?.length || 0})</h4>
                    
                    {selectedRfq.quotations?.length > 0 && (
                      <button
                        onClick={() => { setComparisonRfqId(selectedRfq.id); setActiveTab('compare'); }}
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        <Sparkles size={12} /> Compare Quotations
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedRfq.quotations?.map(quote => (
                      <div key={quote.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <div>
                          <div style={{ fontWeight: '600' }}>{quote.vendor?.companyName}</div>
                          <div style={{ color: 'var(--text-muted)' }}>Delivery: {quote.deliveryDays} days</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '700', color: 'var(--primary)' }}>₹{parseFloat(quote.price).toLocaleString('en-IN')}</div>
                          <span className={`status-pill ${quote.status}`} style={{ fontSize: '0.75rem', padding: '1px 6px' }}>{quote.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bidding workspace for Vendor */}
              {user.role === 'vendor' && selectedRfq.status === 'open' && (
                <form onSubmit={handleBidSubmit} style={{ border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(99,102,241,0.02)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '600', fontFamily: 'var(--font-heading)' }}>
                    {existingBid ? 'Update Your Bid Quotation' : 'Submit Bid Quotation'}
                  </h4>

                  <div className="form-group">
                    <label className="form-label">Your Quotation Price (INR)</label>
                    <input
                      type="number"
                      value={bidPrice}
                      onChange={(e) => setBidPrice(e.target.value)}
                      className="form-control"
                      placeholder="e.g. 2100000"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Delivery Timeline (Days)</label>
                    <input
                      type="number"
                      value={bidDelivery}
                      onChange={(e) => setBidDelivery(e.target.value)}
                      className="form-control"
                      placeholder="e.g. 7"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Quotations Terms / Remarks</label>
                    <textarea
                      value={bidNotes}
                      onChange={(e) => setBidNotes(e.target.value)}
                      className="form-control"
                      placeholder="Specify shipping terms, warranties, tax inclusions..."
                      style={{ height: '70px', resize: 'vertical' }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary glow-hover" disabled={bidLoading}>
                    {bidLoading ? 'Submitting...' : existingBid ? 'Update Bid' : 'Submit Quotation'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create RFQ Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1.5rem' }}>Publish New RFQ</h2>

            <form onSubmit={handleCreateRfq}>
              <div className="form-group">
                <label className="form-label">RFQ Project Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-control"
                  placeholder="e.g. Laptops and Hardware Purchase"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Specifications Details</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-control"
                  placeholder="List all criteria, processor models, storage parameters..."
                  style={{ height: '90px', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-control"
                  >
                    <option value="IT & Hardware">IT & Hardware</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Office Furniture">Office Furniture</option>
                    <option value="Consulting Services">Consulting Services</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="form-control"
                    min={1}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Target Budget (INR)</label>
                  <input
                    type="number"
                    value={targetBudget}
                    onChange={(e) => setTargetBudget(e.target.value)}
                    className="form-control"
                    placeholder="e.g. 500000"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Bid Closing Date</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              {/* Assign Vendors */}
              <div className="form-group">
                <label className="form-label">Invite Specific Vendors (Optional - Defaults to all)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '0.75rem', background: 'var(--input-bg)' }}>
                  {allVendors.map(v => (
                    <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedVendorIds.includes(v.id)}
                        onChange={() => toggleVendorSelection(v.id)}
                      />
                      <span>{v.companyName} ({v.category})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Attachments */}
              <div className="form-group">
                <label className="form-label">Attachments (Optional)</label>
                <div style={{ border: '2px dashed var(--primary)', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', background: 'rgba(99,102,241,0.02)', cursor: 'pointer', transition: 'all 0.3s' }}>
                  <input
                    type="file"
                    multiple
                    onChange={handleAttachmentAdd}
                    style={{ display: 'none' }}
                    id="file-input"
                  />
                  <label htmlFor="file-input" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <Upload size={24} color="var(--primary)" />
                    <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Click to upload files or drag and drop</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Supported: PDF, DOC, XLS, Images, etc.</span>
                  </label>
                </div>

                {/* Display attached files */}
                {attachments.length > 0 && (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '0.85rem' }}>Attached Files ({attachments.length}):</strong>
                    {attachments.map((att, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={16} color="var(--primary)" />
                          <div>
                            <div style={{ fontWeight: '500' }}>{att.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {(att.size / 1024).toFixed(2)} KB
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                        >
                          <X size={18} color="var(--error)" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createLoading}>
                  {createLoading ? 'Publishing...' : 'Publish RFQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
