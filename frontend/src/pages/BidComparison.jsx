import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ArrowLeft, Star, Clock, Trophy, Award, CheckCircle, GitCompare, ChevronDown } from 'lucide-react';

export default function BidComparison({ user, rfqId, setActiveTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittingAward, setSubmittingAward] = useState(null);

  // RFQ picker (when navigated directly from sidebar without an rfqId)
  const [allRfqs, setAllRfqs] = useState([]);
  const [rfqsLoading, setRfqsLoading] = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState(rfqId || '');

  // Load all RFQs if no rfqId was passed in
  useEffect(() => {
    if (!rfqId) {
      setRfqsLoading(true);
      api.get('/rfqs')
        .then(list => setAllRfqs(list || []))
        .catch(() => setAllRfqs([]))
        .finally(() => setRfqsLoading(false));
    }
  }, [rfqId]);

  // Fetch comparison whenever selectedRfqId is set
  useEffect(() => {
    const id = rfqId || selectedRfqId;
    if (!id) return;

    setLoading(true);
    setError('');
    setData(null);

    api.get(`/rfqs/${id}/compare`)
      .then(result => setData(result))
      .catch(err => setError(err.message || 'Failed to load bid comparison'))
      .finally(() => setLoading(false));
  }, [rfqId, selectedRfqId]);

  const handleAwardProposal = async (quotationId) => {
    const remarks = prompt('Add remarks for the manager regarding this award recommendation:');
    if (remarks === null) return;

    setSubmittingAward(quotationId);
    try {
      await api.post('/approvals/initiate', {
        entityType: 'quotation',
        entityId: quotationId,
        remarks
      });
      alert('Award proposal initiated! A workflow approval request has been routed to the Finance Director.');
      setActiveTab('approvals');
    } catch (err) {
      alert(err.message || 'Failed to initiate award proposal');
    } finally {
      setSubmittingAward(null);
    }
  };

  const activeId = rfqId || selectedRfqId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Bid Evaluation Matrix</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Side-by-side vendor quotation comparison. Select the best bid and initiate award.</p>
        </div>
        <button onClick={() => setActiveTab('rfqs')} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
          <ArrowLeft size={15} /> Back to RFQs
        </button>
      </div>

      {/* RFQ Selector (shown only when no rfqId was passed) */}
      {!rfqId && (
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: '600', fontSize: '0.88rem' }}>
              <GitCompare size={16} /> Select RFQ to Compare
            </div>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <select
                value={selectedRfqId}
                onChange={e => setSelectedRfqId(e.target.value)}
                className="form-control"
                style={{ paddingRight: '2rem', fontSize: '0.875rem', width: '100%' }}
                disabled={rfqsLoading}
              >
                <option value="">— Choose an RFQ to compare bids —</option>
                {allRfqs.map(rfq => (
                  <option key={rfq.id} value={rfq.id}>
                    {rfq.title} ({rfq.status})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            </div>
          </div>
        </div>
      )}

      {/* States */}
      {!activeId && (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <GitCompare size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p>Select an RFQ above to load the bid comparison matrix.</p>
        </div>
      )}

      {activeId && loading && (
        <div className="glass-panel" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
          Loading bid comparison data...
        </div>
      )}

      {activeId && error && (
        <div className="glass-panel" style={{ padding: '1.5rem', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(225,29,72,0.04)' }}>
          <span style={{ fontWeight: '600' }}>⚠ Error:</span> {error}
          <br />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            This may happen if no quotations have been submitted for the selected RFQ yet. Try selecting a different RFQ, or ask vendors to submit their bids first.
          </span>
        </div>
      )}

      {activeId && !loading && !error && data && data.bids?.length === 0 && (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No quotations submitted for this RFQ yet. Vendors need to submit their bids first.
        </div>
      )}

      {/* Comparison Matrix */}
      {activeId && !loading && !error && data && data.bids?.length > 0 && (() => {
        const { rfq, bids } = data;
        return (
          <>
            {/* RFQ Summary strip */}
            <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', fontSize: '0.88rem', alignItems: 'center' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>Project</span>
                <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.975rem', marginTop: '2px' }}>{rfq.title}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>Target Budget</span>
                <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.975rem', marginTop: '2px' }}>₹{parseFloat(rfq.targetBudget).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>Quantity</span>
                <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.975rem', marginTop: '2px' }}>{rfq.quantity} units</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>Bids Received</span>
                <div style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.975rem', marginTop: '2px' }}>{bids.length}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span className={`status-pill ${rfq.status}`}>{rfq.status}</span>
              </div>
            </div>

            {/* Comparison Cards */}
            <div className="comparison-matrix">
              {bids.map((bid) => {
                const rating = parseFloat(bid.vendor?.rating || 5);
                return (
                  <div
                    key={bid.id}
                    className={`glass-panel comparison-card ${bid.isLowestPrice ? 'highlight-lowest' : ''} ${bid.isFastestDelivery && !bid.isLowestPrice ? 'highlight-fastest' : ''}`}
                  >
                    {bid.isLowestPrice && <span className="badge-tag lowest"><Trophy size={10} /> Lowest Cost</span>}
                    {bid.isFastestDelivery && !bid.isLowestPrice && <span className="badge-tag fastest"><Clock size={10} /> Fastest</span>}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
                      {/* Vendor header */}
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-heading)', paddingRight: '3rem' }}>{bid.vendor?.companyName}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#fbbf24', marginTop: '6px' }}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} size={13} fill={i < Math.round(rating) ? '#fbbf24' : 'transparent'} stroke="#fbbf24" />
                          ))}
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '5px' }}>({rating.toFixed(1)})</span>
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {bid.vendor?.category} · GSTIN: {bid.vendor?.gstNumber}
                        </div>
                      </div>

                      {/* Metrics block */}
                      <div style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Quoted Cost</span>
                          <span style={{ fontSize: '1.3rem', fontWeight: '800', color: bid.isLowestPrice ? 'var(--success)' : 'var(--text-main)' }}>
                            ₹{parseFloat(bid.price).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Unit Price</span>
                          <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            ₹{(parseFloat(bid.price) / (rfq.quantity || 1)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Delivery Timeline</span>
                          <span style={{ fontWeight: '700', color: bid.isFastestDelivery ? 'var(--info)' : 'var(--text-main)' }}>
                            {bid.deliveryDays} days
                          </span>
                        </div>

                        {/* vs budget */}
                        {(() => {
                          const diff = parseFloat(bid.price) - parseFloat(rfq.targetBudget);
                          const isOver = diff > 0;
                          return (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px dashed var(--panel-border)' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>vs Budget</span>
                              <span style={{ fontWeight: '700', fontSize: '0.82rem', color: isOver ? 'var(--error)' : 'var(--success)' }}>
                                {isOver ? '▲' : '▼'} ₹{Math.abs(diff).toLocaleString('en-IN', { maximumFractionDigits: 0 })} {isOver ? 'over' : 'savings'}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Notes */}
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.04em' }}>Vendor Notes</span>
                        <p style={{ fontSize: '0.855rem', marginTop: '6px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.5' }}>
                          "{bid.notes || 'No terms specified.'}"
                        </p>
                      </div>

                      {/* Status or Award */}
                      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--panel-border)' }}>
                        {rfq.status === 'open' && (user?.role === 'procurement' || user?.role === 'admin') ? (
                          <button
                            onClick={() => handleAwardProposal(bid.id)}
                            disabled={submittingAward !== null}
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                          >
                            <Award size={15} />
                            {submittingAward === bid.id ? 'Initiating...' : 'Select & Send for Approval'}
                          </button>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: bid.status === 'accepted' ? 'var(--success)' : 'var(--text-muted)', fontSize: '0.88rem', fontWeight: '600' }}>
                            {bid.status === 'accepted' ? (
                              <><CheckCircle size={15} /> Awarded</>
                            ) : (
                              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                {rfq.status === 'awarded' ? 'Not Selected' : `Status: ${bid.status}`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}
    </div>
  );
}
