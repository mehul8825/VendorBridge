import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  ArrowLeft, Star, Clock, Trophy, Award, CheckCircle,
  GitCompare, ChevronDown, TrendingDown, TrendingUp,
  ShieldCheck, MessageSquare, BadgeCheck, Zap, Package,
  BarChart2, AlertTriangle, ArrowUpDown
} from 'lucide-react';

// ── Score Bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ flex: 1, height: '8px', background: 'rgba(0,0,0,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width 0.5s ease' }} />
    </div>
  );
}

// ── Rank badge ────────────────────────────────────────────────────────────────
const RANK_COLORS = ['#f59e0b', '#94a3b8', '#b45309', '#64748b'];
const RANK_LABELS = ['🥇 Best Overall', '🥈 Runner-up', '🥉 3rd Place', '4th'];

// ── Parameter row ─────────────────────────────────────────────────────────────
function ParamRow({ icon: Icon, label, score, maxScore, color, detail }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.77rem', color: 'var(--text-muted)', fontWeight: '500' }}>
          <Icon size={12} />
          {label}
          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>/ {maxScore}</span>
        </div>
        <span style={{ fontSize: '0.82rem', fontWeight: '700', color }}>{score.toFixed(1)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ScoreBar value={score} max={maxScore} color={color} />
      </div>
      {detail && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>{detail}</div>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BidComparison({ user, rfqId, setActiveTab }) {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [submittingAward, setSubmittingAward] = useState(null);
  const [viewMode, setViewMode]     = useState('cards'); // 'cards' | 'table'
  const [sortBy, setSortBy]         = useState('score'); // 'score' | 'price' | 'delivery' | 'rating'

  const [allRfqs, setAllRfqs]           = useState([]);
  const [rfqsLoading, setRfqsLoading]   = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState(rfqId || '');

  // Load all RFQs if no rfqId passed from parent
  useEffect(() => {
    if (!rfqId) {
      setRfqsLoading(true);
      api.get('/rfqs').then(l => setAllRfqs(l || [])).catch(() => {}).finally(() => setRfqsLoading(false));
    }
  }, [rfqId]);

  // Fetch comparison whenever active ID changes
  useEffect(() => {
    const id = rfqId || selectedRfqId;
    if (!id) return;
    setLoading(true); setError(''); setData(null);
    api.get(`/rfqs/${id}/compare`)
      .then(r => setData(r))
      .catch(e => setError(e.message || 'Failed to load comparison'))
      .finally(() => setLoading(false));
  }, [rfqId, selectedRfqId]);

  const handleAwardProposal = async (quotationId, vendorName) => {
    const remarks = prompt(`Initiate approval for bid by "${vendorName}".\n\nAdd recommendation remarks for the Finance Manager:`);
    if (remarks === null) return;
    setSubmittingAward(quotationId);
    try {
      await api.post('/approvals/initiate', { entityType: 'quotation', entityId: quotationId, remarks });
      alert(`✅ Award proposal for "${vendorName}" has been sent to the Finance Manager for approval.`);
      setActiveTab('approvals');
    } catch (err) {
      alert(err.message || 'Failed to initiate award proposal');
    } finally {
      setSubmittingAward(null);
    }
  };

  // Sort bids based on selected criterion
  const getSortedBids = (bids) => {
    if (!bids) return [];
    const sorted = [...bids];
    switch (sortBy) {
      case 'price':
        return sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      case 'delivery':
        return sorted.sort((a, b) => parseInt(a.deliveryDays) - parseInt(b.deliveryDays));
      case 'rating':
        return sorted.sort((a, b) => parseFloat(b.vendor?.rating || 0) - parseFloat(a.vendor?.rating || 0));
      case 'score':
      default:
        return sorted.sort((a, b) => b.scores.totalScore - a.scores.totalScore);
    }
  };

  const activeId = rfqId || selectedRfqId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Bid Evaluation Matrix</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Multi-parameter vendor scoring — Price · Delivery · Performance · Response Quality · Budget Compliance
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {data?.bids?.length > 0 && (
            <>
              <div style={{ display: 'flex', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '8px', overflow: 'hidden', fontSize: '0.8rem' }}>
                <button
                  title="Sort by Overall Score"
                  onClick={() => setSortBy('score')}
                  style={{
                    padding: '0.4rem 0.9rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                    background: sortBy === 'score' ? 'var(--primary)' : 'transparent',
                    color: sortBy === 'score' ? '#fff' : 'var(--text-muted)',
                    fontWeight: sortBy === 'score' ? '600' : '500', transition: 'all 0.15s', fontSize: '0.75rem'
                  }}
                >
                  <Trophy size={12} /> Score
                </button>
                <button
                  title="Sort by Lowest Price"
                  onClick={() => setSortBy('price')}
                  style={{
                    padding: '0.4rem 0.9rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                    background: sortBy === 'price' ? 'var(--primary)' : 'transparent',
                    color: sortBy === 'price' ? '#fff' : 'var(--text-muted)',
                    fontWeight: sortBy === 'price' ? '600' : '500', transition: 'all 0.15s', fontSize: '0.75rem'
                  }}
                >
                  <TrendingDown size={12} /> Price
                </button>
                <button
                  title="Sort by Fastest Delivery"
                  onClick={() => setSortBy('delivery')}
                  style={{
                    padding: '0.4rem 0.9rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                    background: sortBy === 'delivery' ? 'var(--primary)' : 'transparent',
                    color: sortBy === 'delivery' ? '#fff' : 'var(--text-muted)',
                    fontWeight: sortBy === 'delivery' ? '600' : '500', transition: 'all 0.15s', fontSize: '0.75rem'
                  }}
                >
                  <Zap size={12} /> Delivery
                </button>
                <button
                  title="Sort by Vendor Rating"
                  onClick={() => setSortBy('rating')}
                  style={{
                    padding: '0.4rem 0.9rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                    background: sortBy === 'rating' ? 'var(--primary)' : 'transparent',
                    color: sortBy === 'rating' ? '#fff' : 'var(--text-muted)',
                    fontWeight: sortBy === 'rating' ? '600' : '500', transition: 'all 0.15s', fontSize: '0.75rem'
                  }}
                >
                  <Star size={12} /> Rating
                </button>
              </div>

              <div style={{ display: 'flex', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '8px', overflow: 'hidden', fontSize: '0.8rem' }}>
                {['cards', 'table'].map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{
                    padding: '0.4rem 0.9rem', border: 'none', cursor: 'pointer',
                    background: viewMode === m ? 'var(--primary)' : 'transparent',
                    color: viewMode === m ? '#fff' : 'var(--text-muted)',
                    fontWeight: viewMode === m ? '600' : '500', transition: 'all 0.15s',
                    textTransform: 'capitalize'
                  }}>{m === 'cards' ? '⬛ Cards' : '📊 Table'}</button>
                ))}
              </div>
            </>
          )}
          <button onClick={() => setActiveTab('rfqs')} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            <ArrowLeft size={14} /> Back to RFQs
          </button>
        </div>
      </div>

      {/* RFQ Picker (when no rfqId from parent) */}
      {!rfqId && (
        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--primary)', fontWeight: '600', fontSize: '0.85rem', flexShrink: 0 }}>
              <GitCompare size={15} /> Select RFQ
            </div>
            <select
              value={selectedRfqId}
              onChange={e => setSelectedRfqId(e.target.value)}
              className="form-control"
              style={{ flex: 1, minWidth: '260px', fontSize: '0.875rem' }}
              disabled={rfqsLoading}
            >
              <option value="">— Choose an RFQ to evaluate bids —</option>
              {allRfqs.map(r => (
                <option key={r.id} value={r.id}>{r.title} [{r.status}]</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* States */}
      {!activeId && (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <BarChart2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.25 }} />
          <p style={{ fontSize: '0.9rem' }}>Select an RFQ above to load the multi-parameter evaluation matrix.</p>
        </div>
      )}
      {activeId && loading && <div className="glass-panel" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Calculating bid scores...</div>}
      {activeId && error && (
        <div className="glass-panel" style={{ padding: '1.25rem', color: 'var(--error)', background: 'rgba(225,29,72,0.04)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ fontWeight: '600' }}>Could not load comparison</div>
            <div style={{ fontSize: '0.82rem', marginTop: '4px', color: 'var(--text-muted)' }}>{error}. Try selecting a different RFQ or ensure vendors have submitted bids.</div>
          </div>
        </div>
      )}
      {activeId && !loading && !error && data?.bids?.length === 0 && (
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No quotations submitted for this RFQ yet. Vendors need to submit their bids first.
        </div>
      )}

      {/* Main evaluation content */}
      {activeId && !loading && !error && data?.bids?.length > 0 && (() => {
        const { rfq, bids, weights } = data;
        const budget = parseFloat(rfq.targetBudget);

        return (
          <>
            {/* RFQ Summary */}
            <div className="glass-panel" style={{ padding: '1rem 1.5rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.06em' }}>Project</div>
                  <div style={{ fontWeight: '700', fontSize: '0.975rem', marginTop: '3px' }}>{rfq.title}</div>
                </div>
                {[
                  { label: 'Target Budget', val: `₹${parseFloat(rfq.targetBudget).toLocaleString('en-IN')}` },
                  { label: 'Quantity',       val: `${rfq.quantity} units` },
                  { label: 'Bids Received',  val: bids.length, color: 'var(--primary)' },
                  { label: 'Deadline',        val: rfq.deadline },
                ].map(({ label, val, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.06em' }}>{label}</div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', marginTop: '3px', color: color || 'var(--text-main)' }}>{val}</div>
                  </div>
                ))}
                <div style={{ marginLeft: 'auto' }}>
                  <span className={`status-pill ${rfq.status}`}>{rfq.status}</span>
                </div>
              </div>
            </div>

            {/* Scoring legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
              {[
                { icon: TrendingDown,   label: `Price (${weights?.price || 35}pts)`,       color: '#6366f1' },
                { icon: Zap,            label: `Delivery (${weights?.delivery || 25}pts)`,  color: '#0ea5e9' },
                { icon: Star,           label: `Performance (${weights?.rating || 20}pts)`, color: '#f59e0b' },
                { icon: MessageSquare,  label: `Response Quality (${weights?.quality || 12}pts)`, color: '#10b981' },
                { icon: ShieldCheck,    label: `Budget Fit (${weights?.compliance || 8}pts)`, color: '#8b5cf6' },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '99px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', fontSize: '0.75rem', fontWeight: '600', color }}>
                  <Icon size={12} />{label}
                </div>
              ))}
              <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                Total Score out of 100
              </div>
            </div>

            {/* ── CARDS VIEW ── */}
            {viewMode === 'cards' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.25rem' }}>
                {getSortedBids(bids).map((bid) => {
                  const s = bid.scores;
                  const isFirst = bid.rank === 1;
                  const rankColor = RANK_COLORS[bid.rank - 1] || '#64748b';
                  const totalPct = s.totalScore;

                  return (
                    <div
                      key={bid.id}
                      className="glass-panel"
                      style={{
                        padding: '1.5rem',
                        borderTop: `3px solid ${rankColor}`,
                        position: 'relative',
                        display: 'flex', flexDirection: 'column', gap: '1.25rem',
                        boxShadow: isFirst ? `0 0 0 2px ${rankColor}30, 0 8px 24px rgba(0,0,0,0.08)` : undefined
                      }}
                    >
                      {/* Rank ribbon */}
                      <div style={{ position: 'absolute', top: '12px', right: '12px', background: rankColor, color: '#fff', fontSize: '0.68rem', fontWeight: '800', padding: '2px 8px', borderRadius: '99px' }}>
                        {RANK_LABELS[bid.rank - 1] || `Rank #${bid.rank}`}
                      </div>

                      {/* Total score donut-style */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
                          <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--panel-border)" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke={rankColor} strokeWidth="3"
                              strokeDasharray={`${totalPct} ${100 - totalPct}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: rankColor, lineHeight: 1 }}>{totalPct}</span>
                            <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>/ 100</span>
                          </div>
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', fontWeight: '700' }}>{bid.vendor?.companyName}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginTop: '4px' }}>
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star key={i} size={11} fill={i < Math.round(parseFloat(bid.vendor?.rating || 0)) ? '#fbbf24' : 'transparent'} stroke="#fbbf24" />
                            ))}
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>({parseFloat(bid.vendor?.rating || 0).toFixed(1)})</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>{bid.vendor?.category}</div>
                        </div>
                      </div>

                      {/* Score breakdown */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--panel-border)' }}>
                        <ParamRow icon={TrendingDown}  label="Price Efficiency"    score={s.priceScore}      maxScore={35} color="#6366f1"
                          detail={`₹${parseFloat(bid.price).toLocaleString('en-IN')} quoted`} />
                        <ParamRow icon={Zap}           label="Delivery Speed"      score={s.deliveryScore}   maxScore={25} color="#0ea5e9"
                          detail={`${bid.deliveryDays} days`} />
                        <ParamRow icon={Star}          label="Vendor Performance"  score={s.ratingScore}     maxScore={20} color="#f59e0b"
                          detail={`${parseFloat(bid.vendor?.rating || 0).toFixed(1)} / 5.0 star rating`} />
                        <ParamRow icon={MessageSquare} label="Response Quality"    score={s.qualityScore}    maxScore={12} color="#10b981"
                          detail={`${s.responseDetail?.wordCount || 0} words · ${s.responseDetail?.keywordsHit?.length || 0} key terms covered`} />
                        <ParamRow icon={ShieldCheck}   label="Budget Compliance"   score={s.complianceScore} maxScore={8}  color="#8b5cf6"
                          detail={s.budgetCompliant
                            ? `✓ Within budget (saves ₹${Math.abs(s.priceDiff || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })})`
                            : `⚠ Over budget by ₹${Math.abs(s.priceDiff || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                          } />
                      </div>

                      {/* Vendor notes */}
                      <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid var(--panel-border)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MessageSquare size={10} /> Vendor Response
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.55', margin: 0 }}>
                          "{bid.notes || 'No bid notes provided.'}"
                        </p>
                        {s.responseDetail?.keywordsHit?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                            {s.responseDetail.keywordsHit.map(k => (
                              <span key={k} style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: '600', textTransform: 'capitalize' }}>
                                ✓ {k}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--panel-border)', paddingTop: '1rem' }}>
                        {rfq.status === 'open' && (user?.role === 'procurement' || user?.role === 'admin') ? (
                          <button
                            onClick={() => handleAwardProposal(bid.id, bid.vendor?.companyName)}
                            disabled={submittingAward !== null}
                            className="btn btn-primary"
                            style={{ width: '100%', gap: '6px', background: isFirst ? 'var(--primary)' : undefined }}
                          >
                            <Award size={14} />
                            {submittingAward === bid.id ? 'Sending to Manager...' : 'Select & Send for Approval'}
                          </button>
                        ) : (
                          <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: '600', color: bid.status === 'accepted' ? 'var(--success)' : 'var(--text-muted)', display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center' }}>
                            {bid.status === 'accepted'
                              ? <><CheckCircle size={14} /> Awarded</>
                              : <span style={{ fontSize: '0.8rem' }}>{rfq.status === 'awarded' ? 'Not Selected' : `Status: ${bid.status}`}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TABLE VIEW ── */}
            {viewMode === 'table' && (
              <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--panel-border)', background: 'rgba(0,0,0,0.02)' }}>
                        {['Rank', 'Vendor', 'Quoted Price', 'Unit Price', 'Delivery', 'Rating', 'Price (35)', 'Delivery (25)', 'Performance (20)', 'Response (12)', 'Budget (8)', 'Total Score', 'Action'].map(h => (
                          <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedBids(bids).map((bid, idx) => {
                        const s = bid.scores;
                        const rankColor = RANK_COLORS[bid.rank - 1] || '#64748b';
                        return (
                          <tr key={bid.id} style={{ borderBottom: '1px solid var(--panel-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.012)' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span style={{ fontWeight: '800', color: rankColor }}>{RANK_LABELS[bid.rank - 1]?.split(' ')[0] || `#${bid.rank}`}</span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ fontWeight: '600' }}>{bid.vendor?.companyName}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{bid.vendor?.category}</div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: bid.isLowestPrice ? '#10b981' : 'var(--text-main)' }}>
                              ₹{parseFloat(bid.price).toLocaleString('en-IN')}
                              {bid.isLowestPrice && <div style={{ fontSize: '0.68rem', color: '#10b981' }}>Lowest</div>}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                              ₹{(parseFloat(bid.price) / (rfq.quantity || 1)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: bid.isFastestDelivery ? '#0ea5e9' : 'var(--text-main)' }}>
                              {bid.deliveryDays}d {bid.isFastestDelivery && <span style={{ fontSize: '0.68rem', color: '#0ea5e9' }}>Fastest</span>}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ display: 'flex', gap: '1px' }}>
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star key={i} size={11} fill={i < Math.round(parseFloat(bid.vendor?.rating || 0)) ? '#fbbf24' : 'transparent'} stroke="#fbbf24" />
                                ))}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{parseFloat(bid.vendor?.rating || 0).toFixed(1)}</div>
                            </td>
                            {[
                              { val: s.priceScore,      max: 35, color: '#6366f1' },
                              { val: s.deliveryScore,   max: 25, color: '#0ea5e9' },
                              { val: s.ratingScore,     max: 20, color: '#f59e0b' },
                              { val: s.qualityScore,    max: 12, color: '#10b981' },
                              { val: s.complianceScore, max: 8,  color: '#8b5cf6' },
                            ].map(({ val, max, color }, i) => (
                              <td key={i} style={{ padding: '0.75rem 1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <ScoreBar value={val} max={max} color={color} />
                                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color, flexShrink: 0 }}>{val.toFixed(1)}</span>
                                </div>
                              </td>
                            ))}
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span style={{ fontSize: '1.1rem', fontWeight: '800', color: rankColor }}>{s.totalScore}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/100</span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {rfq.status === 'open' && (user?.role === 'procurement' || user?.role === 'admin') ? (
                                <button onClick={() => handleAwardProposal(bid.id, bid.vendor?.companyName)} disabled={submittingAward !== null} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', whiteSpace: 'nowrap' }}>
                                  <Award size={12} /> Award
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: bid.status === 'accepted' ? 'var(--success)' : 'var(--text-muted)', fontWeight: '600' }}>
                                  {bid.status === 'accepted' ? '✓ Awarded' : bid.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
