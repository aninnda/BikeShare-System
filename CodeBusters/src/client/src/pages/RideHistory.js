import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './RideHistory.css';

/**
 * R-RH-01 to R-RH-09: Complete Ride History Module
 * - R-RH-01: Search by Trip ID
 * - R-RH-02: Role-based access (riders see their rides, operators see all)
 * - R-RH-03: Filter by date range and bike type
 * - R-RH-04: Display results in a table
 * - R-RH-05: Show "No rides found" message
 * - R-RH-06: View detailed ride information
 * - R-RH-07: Display cost breakdown
 * - R-RH-08: Real-time updates
 * - R-RH-09: Input validation
 */
function RideHistory() {
    const navigate = useNavigate();
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRide, setSelectedRide] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    
    // R-RH-01, R-RH-03: Search and filter states
    const [searchTripId, setSearchTripId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [bikeTypeFilter, setBikeTypeFilter] = useState('all');

    // Get user info from localStorage
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const isOperator = userRole === 'operator';

    // R-RH-08: Auto-refresh every 30 seconds for real-time updates
    useEffect(() => {
        fetchRides();
        const interval = setInterval(fetchRides, 30000);
        return () => clearInterval(interval);
    }, [searchTripId, startDate, endDate, bikeTypeFilter]);

    const fetchRides = async () => {
        try {
            setLoading(true);
            setError(null);

            let url;
            let params = new URLSearchParams();

            // R-RH-02: Role-based endpoint selection
            if (isOperator) {
                url = 'http://localhost:5001/api/rides/all';
                
                // R-RH-01: Add Trip ID search parameter
                if (searchTripId.trim()) {
                    params.append('tripId', searchTripId.trim());
                }
                
                // R-RH-03: Add date range filters
                if (startDate) {
                    params.append('startDate', startDate);
                }
                if (endDate) {
                    params.append('endDate', endDate);
                }
                
                // R-RH-03: Add bike type filter
                if (bikeTypeFilter && bikeTypeFilter !== 'all') {
                    params.append('bikeType', bikeTypeFilter);
                }
            } else {
                // Riders see only their own rides
                url = `http://localhost:5001/api/users/${userId}/rides`;
            }

            const queryString = params.toString();
            const fullUrl = queryString ? `${url}?${queryString}` : url;

            const response = await fetch(fullUrl);
            
            if (!response.ok) {
                throw new Error('Failed to fetch ride history');
            }

            const data = await response.json();
            
            if (data.success) {
                setRides(data.rides || []);
            } else {
                throw new Error(data.message || 'Failed to load rides');
            }
        } catch (err) {
            console.error('Error fetching rides:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // R-RH-09: Input validation for Trip ID
    const handleSearchChange = (e) => {
        const value = e.target.value;
        // Allow TRIP- prefix or just numbers
        if (value === '' || /^(TRIP-?)?\d*$/.test(value)) {
            setSearchTripId(value);
        }
    };

    // R-RH-09: Date validation
    const handleStartDateChange = (e) => {
        const value = e.target.value;
        setStartDate(value);
        
        // Validate end date is after start date
        if (endDate && value > endDate) {
            setEndDate('');
        }
    };

    const handleEndDateChange = (e) => {
        const value = e.target.value;
        
        // R-RH-09: Validate end date is after start date
        if (startDate && value < startDate) {
            alert('End date must be after start date');
            return;
        }
        
        setEndDate(value);
    };

    const handleClearFilters = () => {
        setSearchTripId('');
        setStartDate('');
        setEndDate('');
        setBikeTypeFilter('all');
    };

    // R-RH-06: View detailed ride information
    const handleViewDetails = (ride) => {
        setSelectedRide(ride);
        setShowDetailsModal(true);
    };

    const closeDetailsModal = () => {
        setShowDetailsModal(false);
        setSelectedRide(null);
    };

    // R-RH-07: Calculate cost breakdown
    const calculateCostBreakdown = (ride) => {
        const baseCost = 2.00; // Base fee
        const durationMinutes = ride.durationMinutes || 0;
        
        // Calculate per-minute cost based on bike type
        let perMinuteCost = 0;
        if (ride.bikeType === 'electric') {
            perMinuteCost = 0.15;
        } else if (ride.bikeType === 'cargo') {
            perMinuteCost = 0.20;
        } else {
            perMinuteCost = 0.10;
        }

        const timeCharge = durationMinutes * perMinuteCost;
        const total = baseCost + timeCharge;

        return {
            baseCost,
            perMinuteCost,
            durationMinutes,
            timeCharge,
            total
        };
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatBikeType = (type) => {
        if (!type) return 'Standard';
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    return (
        <div className="ride-history-container">
            <div className="ride-history-header">
                <h1>{isOperator ? 'All Rental History' : 'My Ride History'}</h1>
                <p className="subtitle">
                    {isOperator 
                        ? 'View and search all bike rentals across the system'
                        : 'View your past bike rentals'}
                </p>
            </div>

            {/* R-RH-01, R-RH-03: Search and Filter Section */}
            <div className="filters-section">
                <div className="search-box">
                    <label htmlFor="tripId">
                        Search by Trip ID
                    </label>
                    <input
                        id="tripId"
                        type="text"
                        placeholder="Enter Trip ID (e.g., TRIP-123)"
                        value={searchTripId}
                        onChange={handleSearchChange}
                        className="search-input"
                    />
                </div>

                {isOperator && (
                    <div className="filters-row">
                        <div className="filter-group">
                            <label htmlFor="startDate">Start Date</label>
                            <input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={handleStartDateChange}
                                className="date-input"
                            />
                        </div>

                        <div className="filter-group">
                            <label htmlFor="endDate">End Date</label>
                            <input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={handleEndDateChange}
                                min={startDate}
                                className="date-input"
                            />
                        </div>

                        <div className="filter-group">
                            <label htmlFor="bikeType">Bike Type</label>
                            <select
                                id="bikeType"
                                value={bikeTypeFilter}
                                onChange={(e) => setBikeTypeFilter(e.target.value)}
                                className="bike-type-select"
                            >
                                <option value="all">All Types</option>
                                <option value="standard">Standard</option>
                                <option value="electric">Electric</option>
                                <option value="cargo">Cargo</option>
                            </select>
                        </div>

                        <button onClick={handleClearFilters} className="clear-filters-btn">
                            Clear Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Loading, Error, and Empty States */}
            {loading && (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading ride history...</p>
                </div>
            )}

            {error && (
                <div className="error-state">
                    <p className="error-message">{error}</p>
                    <button onClick={fetchRides} className="retry-btn">Retry</button>
                </div>
            )}

            {/* R-RH-05: No rides found message */}
            {!loading && !error && rides.length === 0 && (
                <div className="no-rides-state">
                    <h3>No Rides Found</h3>
                    <p>
                        {searchTripId || startDate || endDate || (bikeTypeFilter !== 'all')
                            ? 'Try adjusting your search filters'
                            : isOperator
                            ? 'No rental history available in the system'
                            : "You haven't completed any rides yet. Start exploring!"}
                    </p>
                    {(searchTripId || startDate || endDate || (bikeTypeFilter !== 'all')) && (
                        <button onClick={handleClearFilters} className="clear-filters-btn">
                            Clear All Filters
                        </button>
                    )}
                </div>
            )}

            {/* R-RH-04: Results Table */}
            {!loading && !error && rides.length > 0 && (
                <div className="rides-table-container">
                    <div className="results-info">
                        <p>{rides.length} ride{rides.length !== 1 ? 's' : ''} found</p>
                    </div>
                    
                    <table className="rides-table">
                        <thead>
                            <tr>
                                <th>Trip ID</th>
                                {isOperator && <th>Rider</th>}
                                <th>Bike ID</th>
                                <th>Type</th>
                                <th>Start</th>
                                <th>End</th>
                                <th>Duration</th>
                                <th>Cost</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rides.map((ride) => (
                                <tr key={ride.id} className="ride-row">
                                    <td className="trip-id">
                                        <span className="badge badge-trip">{ride.tripId}</span>
                                    </td>
                                    {isOperator && (
                                        <td className="rider-name">{ride.username}</td>
                                    )}
                                    <td className="bike-id">{ride.bikeId}</td>
                                    <td className="bike-type">
                                        <span className={`badge badge-${ride.bikeType}`}>
                                            {formatBikeType(ride.bikeType)}
                                        </span>
                                    </td>
                                    <td className="station-name">{ride.startStation}</td>
                                    <td className="station-name">{ride.endStation}</td>
                                    <td className="duration">{ride.duration.formatted}</td>
                                    <td className="cost">${ride.cost.toFixed(2)}</td>
                                    <td className="actions">
                                        <button
                                            onClick={() => handleViewDetails(ride)}
                                            className="details-btn"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* R-RH-06, R-RH-07: Details Modal with Cost Breakdown */}
            {showDetailsModal && selectedRide && (
                <div className="modal-overlay" onClick={closeDetailsModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Ride Details</h2>
                            <button onClick={closeDetailsModal} className="close-modal-btn">×</button>
                        </div>

                        <div className="modal-body">
                            <div className="detail-section">
                                <h3>Trip Information</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <label>Trip ID:</label>
                                        <span className="badge badge-trip">{selectedRide.tripId}</span>
                                    </div>
                                    {isOperator && (
                                        <div className="detail-item">
                                            <label>Rider:</label>
                                            <span>{selectedRide.username}</span>
                                        </div>
                                    )}
                                    <div className="detail-item">
                                        <label>Bike ID:</label>
                                        <span>{selectedRide.bikeId}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Bike Type:</label>
                                        <span className={`badge badge-${selectedRide.bikeType}`}>
                                            {formatBikeType(selectedRide.bikeType)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h3>Journey Details</h3>
                                <div className="journey-timeline">
                                    <div className="timeline-item">
                                        <div className="timeline-content">
                                            <label>Started at:</label>
                                            <p className="station-name">{selectedRide.startStation}</p>
                                            <p className="datetime">{formatDateTime(selectedRide.startTime)}</p>
                                        </div>
                                    </div>
                                    <div className="timeline-connector"></div>
                                    <div className="timeline-item">
                                        <div className="timeline-content">
                                            <label>Ended at:</label>
                                            <p className="station-name">{selectedRide.endStation}</p>
                                            <p className="datetime">{formatDateTime(selectedRide.endTime)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="duration-display">
                                    <label>Total Duration:</label>
                                    <span className="duration-value">{selectedRide.duration.formatted}</span>
                                </div>
                            </div>

                            {/* R-RH-07: Cost Breakdown */}
                            <div className="detail-section cost-breakdown-section">
                                <h3>Cost Breakdown</h3>
                                {(() => {
                                    const breakdown = calculateCostBreakdown(selectedRide);
                                    return (
                                        <div className="cost-breakdown">
                                            <div className="cost-item">
                                                <span>Base Fee:</span>
                                                <span>${breakdown.baseCost.toFixed(2)}</span>
                                            </div>
                                            <div className="cost-item">
                                                <span>
                                                    Time Charge ({breakdown.durationMinutes} min × ${breakdown.perMinuteCost.toFixed(2)}/min):
                                                </span>
                                                <span>${breakdown.timeCharge.toFixed(2)}</span>
                                            </div>
                                            <div className="cost-divider"></div>
                                            <div className="cost-item cost-total">
                                                <span>Total Cost:</span>
                                                <span className="total-amount">${selectedRide.cost.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button onClick={closeDetailsModal} className="close-btn">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RideHistory;
