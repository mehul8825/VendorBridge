import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Search, Star, ThumbsUp, ThumbsDown, CheckCircle2, UserX } from 'lucide-react';

export default function VendorManagement({ user }) {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratingLoading, setRatingLoading] = useState(null);

  const fetchVendors = async () => {
    try {
      let query = `?search=${search}`;
      if (category) query += `&category=${category}`;
      if (status) query += `&status=${status}`;

      const data = await api.get(`/vendors${query}`);
      setVendors(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch vendor records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [search, category, status]);

  const handleApproveReject = async (id, approveStatus) => {
    try {
      await api.put(`/vendors/${id}/approve`, { status: approveStatus });
      // Refresh list
      fetchVendors();
    } catch (err) {
      alert(err.message || 'Failed to update approval status');
    }
  };

  const handleRating = async (id, currentRating) => {
    const newRatingStr = prompt(`Enter rating (0.0 to 5.0) for this vendor:`, currentRating);
    if (newRatingStr === null) return;

    const newRating = parseFloat(newRatingStr);
    if (isNaN(newRating) || newRating < 0 || newRating > 5) {
      alert('Invalid rating. Must be a decimal number between 0 and 5.');
      return;
    }

    setRatingLoading(id);
    try {
      await api.put(`/vendors/${id}/rate`, { rating: newRating });
      fetchVendors();
    } catch (err) {
      alert(err.message || 'Failed to update rating');
    } finally {
      setRatingLoading(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Vendor Registry</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Maintain registered suppliers, categories, GST verification, and performance reviews.</p>
      </div>

      {/* Filter Header */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-control"
            placeholder="Search by vendor name, contact person or GST number..."
            style={{ paddingLeft: '2.5rem', width: '100%' }}
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="form-control"
          style={{ width: '180px' }}
        >
          <option value="">All Categories</option>
          <option value="IT & Hardware">IT & Hardware</option>
          <option value="Logistics">Logistics</option>
          <option value="Office Furniture">Office Furniture</option>
          <option value="Consulting Services">Consulting Services</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="form-control"
          style={{ width: '160px' }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Vendors Table */}
      <div className="glass-panel" style={{ padding: '1rem' }}>
        {loading ? (
          <div style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Fetching vendor list...</div>
        ) : error ? (
          <div style={{ color: 'var(--error)', padding: '2rem' }}>{error}</div>
        ) : vendors.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>No vendor records found.</div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Category</th>
                  <th>GST Number</th>
                  <th>Contact Details</th>
                  <th>Rating</th>
                  <th>Verification Status</th>
                  {user.role === 'admin' || user.role === 'procurement' ? <th style={{ textAlign: 'right' }}>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      <div style={{ fontWeight: '600' }}>{vendor.companyName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered: {new Date(vendor.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td>{vendor.category}</td>
                    <td><code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{vendor.gstNumber}</code></td>
                    <td>
                      <div>{vendor.contactPerson}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{vendor.phone}</div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleRating(vendor.id, vendor.rating)}
                        disabled={ratingLoading === vendor.id || user.role === 'manager'}
                        style={{ background: 'none', border: 'none', cursor: user.role === 'manager' ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}
                        title={user.role !== 'manager' ? 'Click to rate vendor' : ''}
                      >
                        <Star size={16} fill="#fbbf24" />
                        <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{parseFloat(vendor.rating).toFixed(1)}</span>
                      </button>
                    </td>
                    <td>
                      <span className={`status-pill ${vendor.status}`}>
                        {vendor.status}
                      </span>
                    </td>
                    
                    {user.role === 'admin' || user.role === 'procurement' ? (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {user.role === 'admin' && vendor.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveReject(vendor.id, 'approved')}
                                className="btn btn-success"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                              >
                                <CheckCircle2 size={14} /> Approve
                              </button>
                              <button
                                onClick={() => handleApproveReject(vendor.id, 'rejected')}
                                className="btn btn-danger"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                              >
                                <UserX size={14} /> Reject
                              </button>
                            </>
                          )}
                          {user.role === 'procurement' && (
                            <button
                              onClick={() => handleRating(vendor.id, vendor.rating)}
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            >
                              Rate Vendor
                            </button>
                          )}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
