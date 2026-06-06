import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CheckCircle2, XCircle, Clock, Eye, AlertCircle, ChevronRight, Calendar } from 'lucide-react';

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

  // Workflow state transition visualization
  const getWorkflowStates = (status) => {
    return [
      { label: 'Submitted', completed: true, current: false, color: '#10b981' },
      { label: 'Under Review', completed: status !== 'pending', current: status === 'pending', color: status === 'pending' ? '#f59e0b' : '#10b981' },
      { label: status === 'rejected' ? 'Rejected' : 'Approved', completed: status !== 'pending', current: status !== 'pending', color: status === 'rejected' ? '#ef4444' : '#10b981' }
    ];
  };

  // Calculate approval timeline
  const getApprovalTimeline = (approval) => {
    const createdDate = new Date(approval.createdAt);
    const reviewedDate = approval.updatedAt ? new Date(approval.updatedAt) : null;
    const hoursWaiting = reviewedDate 
      ? ((reviewedDate - createdDate) / (1000 * 60 * 60)).toFixed(1)
      : ((new Date() - createdDate) / (1000 * 60 * 60)).toFixed(1);
    
    return {
      submitted: createdDate.toLocaleString(),
      reviewed: reviewedDate ? reviewedDate.toLocaleString() : 'Pending',
      hoursWaiting: parseFloat(hoursWaiting)
    };
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
                  <th>Waiting Time</th>
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

                  const timeline = getApprovalTimeline(app);
                  const waitingHours = timeline.hoursWaiting;
                  const isOverdue = waitingHours > 24 && app.status === 'pending';

                  return (
                    <tr key={app.id}>
                      <td>
                        <div>{new Date(app.createdAt).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(app.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: isOverdue ? 'var(--error)' : 'var(--text-main)' }}>
                          {waitingHours.toFixed(1)}h
                        </div>
                        {isOverdue && <div style={{ fontSize: '0.7rem', color: 'var(--error)', fontWeight: '600' }}>⚠️ Overdue</div>}
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
          <div className="modal-content glass-panel" style={{ maxWidth: '550px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1.5rem' }}>Review Proposal</h2>
            
            {/* Workflow State Transitions */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Workflow State Transition
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}>
                {getWorkflowStates(selectedApproval.status).map((state, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '0.5rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: state.completed || state.current ? state.color : 'rgba(0,0,0,0.08)',
                      color: state.completed || state.current ? '#fff' : 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: '700'
                    }}>
                      {state.completed ? '✓' : state.current ? '⏳' : (idx + 1)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-main)' }}>{state.label}</div>
                      {state.current && <div style={{ fontSize: '0.65rem', color: state.color, fontWeight: '600' }}>In Progress</div>}
                    </div>
                    {idx < getWorkflowStates(selectedApproval.status).length - 1 && (
                      <ChevronRight size={16} color="var(--panel-border)" style={{ marginLeft: '-0.5rem' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Approval Timeline */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} /> Approval Timeline
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>📤 Submitted:</span>
                  <span style={{ fontWeight: '600' }}>{getApprovalTimeline(selectedApproval).submitted}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>⏱️ Waiting:</span>
                  <span style={{ fontWeight: '600', color: getApprovalTimeline(selectedApproval).hoursWaiting > 24 ? 'var(--error)' : 'var(--text-main)' }}>
                    {getApprovalTimeline(selectedApproval).hoursWaiting} hours
                  </span>
                </div>
                {selectedApproval.status !== 'pending' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>✅ Reviewed:</span>
                    <span style={{ fontWeight: '600' }}>{getApprovalTimeline(selectedApproval).reviewed}</span>
                  </div>
                )}
              </div>
            </div>
            
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
