import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CheckCircle2, XCircle, Clock, Eye, AlertCircle } from 'lucide-react';

export default function Approvals({ user }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sign off Modal
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [remarks, setRemarks] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchApprovals = async () => {
    try {
      const data = await api.get('/approvals');
      setApprovals(data);
    } catch (err) {
      setError(err.message || 'Failed to load approvals queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await api.put(`/approvals/${selectedApproval.id}/review`, {
        status: reviewStatus,
        remarks
      });
      alert(`Approval task reviewed and marked as ${reviewStatus}.`);
      setSelectedApproval(null);
      setRemarks('');
      fetchApprovals();
    } catch (err) {
      alert(err.message || 'Failed to submit review decisions');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Workflow Approvals</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Review pending organizational award proposals, bids, and Purchase Order issuances.</p>
      </div>

      <div className="glass-panel" style={{ padding: '1rem' }}>
        {loading ? (
          <div style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Fetching approvals queue...</div>
        ) : error ? (
          <div style={{ color: 'var(--error)', padding: '2rem' }}>{error}</div>
        ) : approvals.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>No approval requests assigned to you.</div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Requested Date</th>
                  <th>Entity Type</th>
                  <th>Project Name / Details</th>
                  <th>Target Cost</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((app) => {
                  let detailsLabel = 'Details Unresolved';
                  let amount = 0;
                  
                  if (app.entity) {
                    if (app.entityType === 'quotation') {
                      detailsLabel = `Bid Award Proposal for RFQ: "${app.entity.rfq?.title}" by ${app.entity.vendor?.companyName}`;
                      amount = parseFloat(app.entity.price);
                    } else if (app.entityType === 'po') {
                      detailsLabel = `Purchase Order Release for PO: ${app.entity.poNumber}`;
                      amount = parseFloat(app.entity.totalAmount);
                    }
                  }

                  return (
                    <tr key={app.id}>
                      <td>
                        <div>{new Date(app.createdAt).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(app.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td>
                        <span style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                          {app.entityType === 'quotation' ? 'Bid Award' : 'PO Release'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: '500', maxWidth: '350px', whiteSpace: 'normal' }}>{detailsLabel}</div>
                        {app.remarks && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '4px' }}>
                            Req Remarks: "{app.remarks}"
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: '600' }}>₹{amount.toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`status-pill ${app.status}`}>
                          {app.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {app.status === 'pending' ? (
                          <button
                            onClick={() => setSelectedApproval(app)}
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          >
                            <Eye size={14} /> Review & Action
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedApproval && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1.5rem' }}>Review Proposal Proposal</h2>
            
            <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Workflow Type:</span>
                <span style={{ fontWeight: '600', marginLeft: '0.5rem', textTransform: 'uppercase', color: 'var(--primary)' }}>
                  {selectedApproval.entityType === 'quotation' ? 'Bid Award Approval' : 'Purchase Order Issuance'}
                </span>
              </div>

              {selectedApproval.entityType === 'quotation' && selectedApproval.entity && (
                <>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Project RFQ:</span>
                    <div style={{ fontWeight: '600', marginTop: '2px' }}>{selectedApproval.entity.rfq?.title}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Recommended Vendor:</span>
                    <div style={{ fontWeight: '600', marginTop: '2px' }}>{selectedApproval.entity.vendor?.companyName}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Cost Value:</span>
                    <div style={{ fontWeight: '700', color: 'var(--success)', marginTop: '2px' }}>
                      ₹{parseFloat(selectedApproval.entity.price).toLocaleString('en-IN')}
                    </div>
                  </div>
                </>
              )}

              {selectedApproval.entityType === 'po' && selectedApproval.entity && (
                <>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>PO Identifier:</span>
                    <div style={{ fontWeight: '600', marginTop: '2px' }}>{selectedApproval.entity.poNumber}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>PO Amount:</span>
                    <div style={{ fontWeight: '700', color: 'var(--success)', marginTop: '2px' }}>
                      ₹{parseFloat(selectedApproval.entity.totalAmount).toLocaleString('en-IN')}
                    </div>
                  </div>
                </>
              )}
            </div>

            <form onSubmit={handleReviewSubmit}>
              <div className="form-group">
                <label className="form-label">Review Actions</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.75rem', border: '1px solid var(--panel-border)', borderRadius: '8px', cursor: 'pointer', background: reviewStatus === 'approved' ? 'var(--success-glow)' : 'transparent', color: reviewStatus === 'approved' ? 'var(--success)' : 'var(--text-secondary)', transition: 'var(--transition)' }}>
                    <input
                      type="radio"
                      name="status"
                      value="approved"
                      checked={reviewStatus === 'approved'}
                      onChange={() => setReviewStatus('approved')}
                      style={{ display: 'none' }}
                    />
                    <CheckCircle2 size={16} /> Approve
                  </label>

                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.75rem', border: '1px solid var(--panel-border)', borderRadius: '8px', cursor: 'pointer', background: reviewStatus === 'rejected' ? 'var(--error-glow)' : 'transparent', color: reviewStatus === 'rejected' ? 'var(--error)' : 'var(--text-secondary)', transition: 'var(--transition)' }}>
                    <input
                      type="radio"
                      name="status"
                      value="rejected"
                      checked={reviewStatus === 'rejected'}
                      onChange={() => setReviewStatus('rejected')}
                      style={{ display: 'none' }}
                    />
                    <XCircle size={16} /> Reject
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Sign-off Remarks / Comments</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="form-control"
                  placeholder="Provide brief remarks for the procurement team..."
                  style={{ height: '70px', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setSelectedApproval(null)} className="btn btn-secondary">
                  Close
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Signing off...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
