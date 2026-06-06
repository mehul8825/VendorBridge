import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ArrowLeft, Star, Clock, Trophy, Award, CheckCircle } from 'lucide-react';

export default function BidComparison({ user, rfqId, setActiveTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingAward, setSubmittingAward] = useState(null);

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        const result = await api.get(`/rfqs/${rfqId}/compare`);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load bid comparison board');
      } finally {
        setLoading(false);
      }
    };
    fetchComparison();
  }, [rfqId]);

  const handleAwardProposal = async (quotationId) => {
    const remarks = prompt("Add remarks for the manager regarding this award award recommendation:");
    if (remarks === null) return; // cancelled

    setSubmittingAward(quotationId);
    try {
      await api.post('/approvals/initiate', {
        entityType: 'quotation',
        entityId: quotationId,
        remarks
      });
      alert('Award proposal initiated! A workflow approval request has been routed to the Finance Director for review.');
      setActiveTab('rfqs');
    } catch (err) {
      alert(err.message || 'Failed to initiate award proposal');
    } finally {
      setSubmittingAward(null);
    }
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Evaluating bids comparison...</div>;
  if (error) return <div style={{ color: 'var(--error)', padding: '2rem' }}>Error: {error}</div>;
  if (!data || data.bids.length === 0) {
    return (
      <div style={{ padding: '2rem' }}>
        <button onClick={() => setActiveTab('rfqs')} className="btn btn-secondary" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to RFQs
        </button>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No quotations submitted for this RFQ yet.
        </div>
      </div>
    );
  }

  const { rfq, bids, lowestPrice, fastestDelivery } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <button onClick={() => setActiveTab('rfqs')} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to RFQs
        </button>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Quotation Comparison</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Side-by-side commercial comparison for project: "{rfq.title}"</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', fontSize: '0.9rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem' }}>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Target Budget:</span>
          <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>₹{parseFloat(rfq.targetBudget).toLocaleString('en-IN')}</div>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Total Bids Received:</span>
          <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{bids.length}</div>
        </div>
      </div>

      <div className="comparison-matrix">
        {bids.map((bid) => {
          const ratingStars = Array.from({ length: 5 }, (_, i) => i < Math.round(bid.vendor?.rating || 5));
          
          return (
            <div
              key={bid.id}
              className={`glass-panel comparison-card ${bid.isLowestPrice ? 'highlight-lowest' : ''} ${bid.isFastestDelivery && !bid.isLowestPrice ? 'highlight-fastest' : ''}`}
            >
              {bid.isLowestPrice && <span className="badge-tag lowest"><Trophy size={10} /> Lowest Cost</span>}
              {bid.isFastestDelivery && !bid.isLowestPrice && <span className="badge-tag fastest"><Clock size={10} /> Fastest Delivery</span>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
                {/* Header */}
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-heading)', paddingRight: '2.5rem' }}>{bid.vendor?.companyName}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#fbbf24', marginTop: '4px' }}>
                    {ratingStars.map((isFilled, i) => (
                      <Star key={i} size={14} fill={isFilled ? '#fbbf24' : 'transparent'} stroke="#fbbf24" />
                    ))}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>({parseFloat(bid.vendor?.rating).toFixed(1)})</span>
                  </div>
                </div>

                {/* Metrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Quoted Cost:</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: '800', color: bid.isLowestPrice ? 'var(--success)' : 'var(--text-main)' }}>
                      ₹{parseFloat(bid.price).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Delivery Timeline:</span>
                    <span style={{ fontWeight: '600', color: bid.isFastestDelivery ? 'var(--info)' : 'var(--text-main)' }}>
                      {bid.deliveryDays} Days
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Vendor Terms & Notes:</span>
                  <p style={{ fontSize: '0.875rem', marginTop: '4px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                    "{bid.notes || 'No terms specified.'}"
                  </p>
                </div>

                {/* Status or Award Buttons */}
                <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--panel-border)' }}>
                  {rfq.status === 'open' ? (
                    <button
                      onClick={() => handleAwardProposal(bid.id)}
                      disabled={submittingAward !== null}
                      className="btn btn-primary glow-hover"
                      style={{ width: '100%', gap: '6px' }}
                    >
                      <Award size={16} /> 
                      {submittingAward === bid.id ? 'Initiating...' : 'Select & Initiate Award'}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: bid.status === 'accepted' ? 'var(--success)' : 'var(--text-muted)' }}>
                      {bid.status === 'accepted' ? (
                        <>
                          <CheckCircle size={16} />
                          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Project Awarded</span>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.85rem' }}>Closed / Not Selected</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
