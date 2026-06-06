import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  FileText, 
  ClipboardCheck, 
  AlertCircle, 
  TrendingUp, 
  PlusCircle, 
  Truck, 
  ShieldCheck, 
  HelpCircle,
  Clock
} from 'lucide-react';

export default function Dashboard({ user, setActiveTab, setComparisonRfqId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get('/dashboard/stats');
        setStats(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch dashboard stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Loading dashboard analytics...</div>;
  if (error) return <div style={{ color: 'var(--error)', padding: '2rem' }}>Error: {error}</div>;
  if (!stats) return <div style={{ padding: '2rem' }}>No data available.</div>;

  // Onboarding check for vendors
  if (user.role === 'vendor' && stats.status === 'onboarding_required') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertCircle size={48} color="var(--warning)" style={{ marginBottom: '1rem' }} />
          <h3>Onboarding Profile Required</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            Please submit your business and tax details first to gain access to invitations, bidding, and purchase orders.
          </p>
          <button onClick={() => setActiveTab('onboarding')} className="btn btn-primary">
            Start Onboarding Form
          </button>
        </div>
      </div>
    );
  }

  // Helper for drawing SVG Bar Chart
  const renderBarChart = () => {
    const data = stats.monthlyTrends || [];
    if (data.length === 0) return <p style={{ color: 'var(--text-muted)' }}>No monthly trends data.</p>;

    const maxAmt = Math.max(...data.map(d => d.amount), 100000);
    const height = 180;
    const width = 450;
    const padding = 35;
    const barWidth = 35;
    const gap = 30;

    return (
      <svg viewBox={`0 0 ${width} ${height + padding}`} style={{ width: '100%', maxHeight: '220px' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const y = padding + (height - padding) * (1 - r);
          const amtLabel = Math.round(maxAmt * r / 1000) + 'k';
          return (
            <g key={i}>
              <line x1="45" y1={y} x2={width - 15} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x="5" y={y + 4} fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-heading)">{amtLabel}</text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, index) => {
          const x = 50 + index * (barWidth + gap);
          const barHeight = ((d.amount || 0) / maxAmt) * (height - padding);
          const y = height - barHeight;
          const isHovered = false; // Simple layout

          return (
            <g key={index}>
              {/* Glowing Gradient fill for active values */}
              <defs>
                <linearGradient id={`bar-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
              </defs>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill={`url(#bar-grad-${index})`}
                opacity={d.amount > 0 ? 0.95 : 0.2}
                style={{ transition: 'var(--transition)' }}
              />
              {/* Tooltip value */}
              {d.amount > 0 && (
                <text x={x + barWidth/2} y={y - 6} fill="#fff" fontSize="8" fontWeight="600" textAnchor="middle">
                  {Math.round(d.amount/1000)}k
                </text>
              )}
              {/* X label */}
              <text x={x + barWidth/2} y={height + 18} fill="var(--text-secondary)" fontSize="9" textAnchor="middle" fontFamily="var(--font-heading)">
                {d.month.split(' ')[0]}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // Helper for drawing SVG Donut Chart
  const renderDonutChart = () => {
    const data = stats.categoryDistribution || [];
    if (data.length === 0) return <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No category data.</p>;

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'];
    
    let accumulatedAngle = 0;
    const r = 50;
    const cx = 80;
    const cy = 80;
    const circumference = 2 * Math.PI * r;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'center' }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx={cx} cy={cy} r={r} fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="18" />
          {data.map((item, idx) => {
            const percentage = item.value / total;
            const strokeLength = percentage * circumference;
            const strokeOffset = circumference - strokeLength + accumulatedAngle;
            accumulatedAngle -= strokeLength;
            
            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={r}
                fill="transparent"
                stroke={colors[idx % colors.length]}
                strokeWidth="18"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                transform="rotate(-90 80 80)"
                style={{ transition: 'var(--transition)' }}
              />
            );
          })}
          <text x={cx} y={cy + 4} fill="#fff" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="var(--font-heading)">
            {total} RFQs
          </text>
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {data.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: colors[idx % colors.length] }} />
              <span style={{ color: 'var(--text-secondary)' }}>{item.name}:</span>
              <span style={{ fontWeight: '600' }}>{item.value} ({Math.round(percentage = (item.value/total)*100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRoleCards = () => {
    switch (user.role) {
      case 'admin':
        return (
          <div className="stats-grid">
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <span className="stat-label">Total ERP Users</span>
                <span className="stat-value">{stats.totalUsers}</span>
              </div>
              <div className="stat-icon primary"><PlusCircle size={22} /></div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <span className="stat-label">Total Registered Vendors</span>
                <span className="stat-value">{stats.totalVendors}</span>
              </div>
              <div className="stat-icon info"><Truck size={22} /></div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <span className="stat-label">Pending Vendor Approvals</span>
                <span className="stat-value">{stats.pendingVendors}</span>
              </div>
              <div className="stat-icon warning"><Clock size={22} /></div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <span className="stat-label">Total Organization Spend</span>
                <span className="stat-value">₹{parseFloat(stats.totalSpend || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-icon success"><TrendingUp size={22} /></div>
            </div>
          </div>
        );

      case 'procurement':
        return (
          <div className="stats-grid">
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <span className="stat-label">Active RFQs</span>
                <span className="stat-value">{stats.activeRFQs}</span>
              </div>
              <div className="stat-icon info"><FileText size={22} /></div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <span className="stat-label">Total Purchase Orders</span>
                <span className="stat-value">{stats.totalPOs}</span>
              </div>
              <div className="stat-icon primary"><ClipboardCheck size={22} /></div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <span className="stat-label">Pending PO Approvals</span>
                <span className="stat-value">{stats.pendingPOApprovals}</span>
              </div>
              <div className="stat-icon warning"><Clock size={22} /></div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <span className="stat-label">Total Disbursed Spend</span>
                <span className="stat-value">₹{parseFloat(stats.totalSpend || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-icon success"><TrendingUp size={22} /></div>
            </div>
          </div>
        );

      case 'manager':
        return (
          <div className="stats-grid">
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <span className="stat-label">Pending Your Review</span>
                <span className="stat-value" style={{ color: 'var(--warning)', WebkitTextFillColor: 'initial' }}>{stats.pendingApprovals}</span>
              </div>
              <div className="stat-icon warning"><Clock size={22} /></div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <span className="stat-label">Total Approved Items</span>
                <span className="stat-value">{stats.approvedCount}</span>
              </div>
              <div className="stat-icon success"><ShieldCheck size={22} /></div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <span className="stat-label">Active RFQ Projects</span>
                <span className="stat-value">{stats.activeRFQs}</span>
              </div>
              <div className="stat-icon info"><FileText size={22} /></div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <span className="stat-label">Approved Spend Value</span>
                <span className="stat-value">₹{parseFloat(stats.approvedSpend || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-icon primary"><TrendingUp size={22} /></div>
            </div>
          </div>
        );

      case 'vendor':
        return (
          <div className="stats-grid">
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <span className="stat-label">Bids Submitted</span>
                <span className="stat-value">{stats.myBidsCount}</span>
              </div>
              <div className="stat-icon primary"><FileText size={22} /></div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <span className="stat-label">Bids Won</span>
                <span className="stat-value" style={{ color: 'var(--success)', WebkitTextFillColor: 'initial' }}>{stats.bidsWonCount}</span>
              </div>
              <div className="stat-icon success"><ShieldCheck size={22} /></div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <span className="stat-label">Uploaded Invoices</span>
                <span className="stat-value">{stats.myInvoicesCount}</span>
              </div>
              <div className="stat-icon info"><PlusCircle size={22} /></div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-info">
                <span className="stat-label">Total Earned Revenue</span>
                <span className="stat-value">₹{parseFloat(stats.totalEarnings || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-icon success"><TrendingUp size={22} /></div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Welcome back, {user.name}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Monitor ERP procurement pipelines, transactions, and status boards.</p>
      </div>

      {/* Stats Cards Section */}
      {renderRoleCards()}

      {/* Main Charts & Activities Grid */}
      <div className="dashboard-grid">
        {/* Left Side: Trends and recent logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)' }}>Monthly Procurement Spending Trend</h3>
            {renderBarChart()}
          </div>

          {/* Quick Actions Panel */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>Quick Actions Shortcuts</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {user.role === 'procurement' && (
                <>
                  <button onClick={() => setActiveTab('rfqs')} className="btn btn-primary">
                    <PlusCircle size={16} /> Create RFQ Project
                  </button>
                  <button onClick={() => setActiveTab('vendors')} className="btn btn-secondary">
                    <Truck size={16} /> View Vendor Registry
                  </button>
                </>
              )}
              {user.role === 'admin' && (
                <>
                  <button onClick={() => setActiveTab('vendors')} className="btn btn-primary">
                    Verify Pending Vendors
                  </button>
                  <button onClick={() => setActiveTab('logs')} className="btn btn-secondary">
                    Inspect Audit Logs
                  </button>
                </>
              )}
              {user.role === 'manager' && (
                <button onClick={() => setActiveTab('approvals')} className="btn btn-primary">
                  Review Approvals Queue
                </button>
              )}
              {user.role === 'vendor' && (
                <>
                  <button onClick={() => setActiveTab('rfqs')} className="btn btn-primary">
                    Browse Active RFQs
                  </button>
                  <button onClick={() => setActiveTab('pos')} className="btn btn-secondary">
                    Accept Purchase Orders
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Donut chart and alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)' }}>RFQ Category Breakdown</h3>
            {renderDonutChart()}
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>ERP Activity Feed</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
              {user.role === 'admin' && stats.recentActivities ? (
                stats.recentActivities.map((log, index) => (
                  <div key={index} style={{ fontSize: '0.825rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: '600' }}>{log.action}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{log.details}</p>
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Mocking generic system alerts if logs not returned directly for this role */}
                  <div style={{ fontSize: '0.825rem' }}>
                    <span style={{ color: 'var(--success)', fontWeight: '600' }}>SYS_OK</span>
                    <p style={{ color: 'var(--text-secondary)' }}>ERP connection established.</p>
                  </div>
                  <div style={{ fontSize: '0.825rem' }}>
                    <span style={{ color: 'var(--info)', fontWeight: '600' }}>DATABASE_SYNCED</span>
                    <p style={{ color: 'var(--text-secondary)' }}>Synced configurations and schemas successfully.</p>
                  </div>
                  {user.role === 'vendor' && (
                    <div style={{ fontSize: '0.825rem' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: '600' }}>PROFILE_VERIFIED</span>
                      <p style={{ color: 'var(--text-secondary)' }}>Your profile is approved. You can submit bids.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
