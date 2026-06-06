import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ClipboardList, Download, RefreshCw, BarChart } from 'lucide-react';

export default function LogsReports({ user }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const logsData = await api.get('/dashboard/logs');
      setLogs(logsData);
      
      const statsData = await api.get('/dashboard/stats');
      setStats(statsData);
    } catch (err) {
      setError(err.message || 'Failed to retrieve logs and reports data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Export to CSV Function
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    
    // Headers
    const headers = ['ID', 'Timestamp', 'User', 'Role', 'Action', 'Details'];
    const rows = logs.map(l => [
      l.id,
      new Date(l.createdAt).toLocaleString(),
      l.user?.name || 'System',
      l.user?.role || 'System',
      l.action,
      `"${l.details?.replace(/"/g, '""')}"` // Escape quotes
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vendorbridge_audit_logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Audit Logs & Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Inspect ERP system transaction workflows, user operations audit trail, and print spreadsheets.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchData} className="btn btn-secondary" style={{ padding: '0.6rem' }} title="Refresh Log Data">
            <RefreshCw size={16} />
          </button>
          <button onClick={handleExportCSV} className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', gap: '6px' }}>
            <Download size={16} /> Export Reports (CSV)
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Fetching logs and spreadsheets...</div>
      ) : error ? (
        <div style={{ color: 'var(--error)', padding: '2rem' }}>{error}</div>
      ) : (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
          
          {/* Left Side: Summary table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-heading)' }}>
                <BarChart size={18} color="var(--primary)" /> Spend Sheet Report
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                {stats?.monthlyTrends?.map((trend, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: '500' }}>{trend.month}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', color: 'var(--success)' }}>₹{trend.amount.toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{trend.orders} POs issued</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side: Audit Logs Grid */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-heading)' }}>
              <ClipboardList size={18} color="var(--primary)" /> System Operations Log (Audit Trail)
            </h3>

            <div className="table-container" style={{ maxHeight: '450px', overflowY: 'auto' }}>
              <table className="custom-table" style={{ fontSize: '0.825rem' }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User Profile</th>
                    <th>Action</th>
                    <th>Operation Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{log.user?.name || 'System'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {log.user?.role || 'Automated Service'}
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${
                          log.action.includes('APPROVED') || log.action.includes('ACCEPTED') || log.action.includes('PAID') 
                            ? 'approved' 
                            : log.action.includes('REJECTED') || log.action.includes('CLOSED') 
                              ? 'rejected' 
                              : 'draft'
                        }`} style={{ fontSize: '0.725rem', padding: '1px 6px' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', maxWidth: '280px', whiteSpace: 'normal' }}>
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
