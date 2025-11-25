import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DamageReportNotifications from '../components/DamageReportNotifications';
import './style/Analytics.css';

const Analytics = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // State management
    const [rides, setRides] = useState([]);
    const [filteredRides, setFilteredRides] = useState([]);
    const [showOwn, setShowOwn] = useState(false); // show only current user's rides (for dual)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'completed'
    const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'duration', 'cost'

    // Check if user is operator (allow 'dual' as operator-equivalent)
    useEffect(() => {
        if (!user || (user.role !== 'operator' && user.role !== 'dual')) {
            navigate('/');
        }
    }, [user, navigate]);

    // Fetch all rides
    const fetchRides = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            
            const response = await fetch('http://localhost:5001/api/rentals/all', {
                headers: {
                    'x-user-id': user.id.toString(),
                    'x-user-role': user.role,
                    'x-username': user.username || user.email || `user_${user.id}`
                }
            });

            const data = await response.json();

            if (data.success || data.rentals) {
                let ridesData = data.rentals || data.data || [];
                if (showOwn && user && user.id) {
                    ridesData = ridesData.filter(r => String(r.user_id) === String(user.id) || String(r.username) === String(user.username));
                }
                setRides(ridesData);
                setFilteredRides(ridesData);
            } else {
                setError(data.message || 'Failed to load rides');
            }
        } catch (err) {
            console.error('Error fetching rides:', err);
            setError('Network error loading rides');
        } finally {
            setLoading(false);
        }
    }, [user, showOwn]);

    // Load rides on mount (allow 'dual' to fetch operator rides too)
    useEffect(() => {
        if (user && (user.role === 'operator' || user.role === 'dual')) {
            fetchRides();
        }
    }, [user, fetchRides]);

    // Filter and sort rides
    useEffect(() => {
        let result = [...rides];

        // Apply search filter
        if (searchTerm) {
            result = result.filter(ride => 
                ride.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ride.bike_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ride.id?.toString().includes(searchTerm)
            );
        }

        // Apply status filter
        if (filterStatus !== 'all') {
            result = result.filter(ride => {
                if (filterStatus === 'active') {
                    return !ride.end_time;
                } else if (filterStatus === 'completed') {
                    return ride.end_time;
                }
                return true;
            });
        }

        // Apply sorting
        result.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.start_time) - new Date(a.start_time);
                case 'oldest':
                    return new Date(a.start_time) - new Date(b.start_time);
                case 'duration':
                    const durationA = a.duration_minutes || 0;
                    const durationB = b.duration_minutes || 0;
                    return durationB - durationA;
                case 'cost':
                    const costA = a.total_cost || 0;
                    const costB = b.total_cost || 0;
                    return costB - costA;
                default:
                    return 0;
            }
        });

        setFilteredRides(result);
    }, [rides, searchTerm, filterStatus, sortBy]);

    // Format date and time
    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Format duration
    const formatDuration = (minutes) => {
        if (!minutes) return 'N/A';
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    // Format cost
    const formatCost = (cost) => {
        if (cost === null || cost === undefined) return 'N/A';
        return `$${parseFloat(cost).toFixed(2)}`;
    };

    // Calculate statistics
    const stats = {
        total: rides.length,
        active: rides.filter(r => !r.end_time).length,
        completed: rides.filter(r => r.end_time).length,
        totalRevenue: rides.reduce((sum, r) => sum + (r.total_cost || 0), 0)
    };

    return (
        <div className="manage-rides-container">
            <div className="manage-rides-header">
                <h1 className="manage-rides-title">Ride Management</h1>
                <p className="manage-rides-subtitle">View and monitor all bike rentals</p>
            </div>

            {/* Damage Report Notifications */}
            <DamageReportNotifications user={user} />

            {/* Statistics Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Rides</div>
                    </div>
                </div>
                <div className="stat-card active">
                    <div className="stat-content">
                        <div className="stat-value">{stats.active}</div>
                        <div className="stat-label">Active Rides</div>
                    </div>
                </div>
                <div className="stat-card completed">
                    <div className="stat-content">
                        <div className="stat-value">{stats.completed}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                </div>
                <div className="stat-card revenue">
                    <div className="stat-content">
                        <div className="stat-value">{formatCost(stats.totalRevenue)}</div>
                        <div className="stat-label">Total Revenue</div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="controls-section">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search by user, bike ID, or ride ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                
                <div className="filters">
                    {user && user.role === 'dual' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#333', marginRight: '12px' }}>
                            <input type="checkbox" checked={showOwn} onChange={(e) => setShowOwn(e.target.checked)} />
                            <span style={{ fontSize: '0.95rem' }}>My Rides Only</span>
                        </label>
                    )}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Rides</option>
                        <option value="active">Active Only</option>
                        <option value="completed">Completed Only</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="filter-select"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="duration">By Duration</option>
                        <option value="cost">By Cost</option>
                    </select>

                    <button onClick={fetchRides} className="refresh-btn">
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="loading-spinner">Loading rides...</div>
            ) : (
                <div className="rides-table-container">
                    <table className="rides-table">
                        <thead>
                            <tr>
                                <th>Ride ID</th>
                                <th>User</th>
                                <th>Bike ID</th>
                                <th>Start Time</th>
                                <th>End Time</th>
                                <th>Duration</th>
                                <th>Cost</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRides.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="no-data">
                                        {searchTerm || filterStatus !== 'all' 
                                            ? 'No rides match your filters' 
                                            : 'No rides found'}
                                    </td>
                                </tr>
                            ) : (
                                filteredRides.map((ride) => (
                                    <tr key={ride.id} className={ride.end_time ? 'completed' : 'active'}>
                                        <td>
                                            <span className="ride-id">#{ride.id}</span>
                                        </td>
                                        <td>
                                            <strong>{ride.username || 'Unknown'}</strong>
                                        </td>
                                        <td>
                                            <span className="bike-id">{ride.bike_id || 'N/A'}</span>
                                        </td>
                                        <td>{formatDateTime(ride.start_time)}</td>
                                        <td>{formatDateTime(ride.end_time)}</td>
                                        <td>
                                            <span className="duration">
                                                {formatDuration(ride.duration_minutes)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="cost">
                                                {formatCost(ride.total_cost)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${ride.end_time ? 'completed' : 'active'}`}>
                                                {ride.end_time ? 'Completed' : 'Active'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="rides-summary">
                Showing {filteredRides.length} of {rides.length} rides
            </div>
        </div>
    );
};

export default Analytics;
