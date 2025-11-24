import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Ride History Component with Filters
const RideHistory = ({ userId }) => {
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Filter states
    const [tripIdSearch, setTripIdSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [bikeTypeFilter, setBikeTypeFilter] = useState('all');
    
    const fetchRideHistory = useCallback(async () => {
        if (!userId) return;
        
        try {
            setLoading(true);
            setError('');
            
            // Build query parameters
            const params = new URLSearchParams();
            if (tripIdSearch.trim()) params.append('tripId', tripIdSearch.trim());
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (bikeTypeFilter && bikeTypeFilter !== 'all') params.append('bikeType', bikeTypeFilter);
            
            const queryString = params.toString();
            const url = `http://localhost:5001/api/users/${userId}/rides${queryString ? '?' + queryString : ''}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                setRides(data.rides || []);
            } else {
                setError('Failed to load ride history');
            }
        } catch (err) {
            console.error('Error fetching ride history:', err);
            setError('Error loading ride history');
        } finally {
            setLoading(false);
        }
    }, [userId, tripIdSearch, startDate, endDate, bikeTypeFilter]);

    useEffect(() => {
        fetchRideHistory();
    }, [userId, fetchRideHistory]);
    
    const handleSearch = () => {
        fetchRideHistory();
    };
    
    const handleClearFilters = () => {
        setTripIdSearch('');
        setStartDate('');
        setEndDate('');
        setBikeTypeFilter('all');
        // Fetch again after clearing
        setTimeout(() => fetchRideHistory(), 100);
    };

    return (
        <div>
            {/* Filter Controls */}
            <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '2px solid #e9ecef'
            }}>
                <h3 style={{ 
                    margin: '0 0 15px 0', 
                    fontSize: '1.1rem',
                    color: '#495057'
                }}>
                    Search & Filter Rides
                </h3>
                
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '15px',
                    marginBottom: '15px'
                }}>
                    {/* Trip ID Search */}
                    <div>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '5px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            color: '#495057'
                        }}>
                            Trip ID
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., TRIP-63"
                            value={tripIdSearch}
                            onChange={(e) => setTripIdSearch(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            style={{
                                width: '100%',
                                padding: '2px 6px',
                                border: '1px solid #ced4da',
                                borderRadius: '6px',
                                fontSize: '0.9rem',
                                height: '26px'
                            }}
                        />
                    </div>
                    
                    {/* Start Date */}
                    <div>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '5px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            color: '#495057'
                        }}>
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '2px 6px',
                                border: '1px solid #ced4da',
                                borderRadius: '6px',
                                fontSize: '0.9rem',
                                height: '26px'
                            }}
                        />
                    </div>
                    
                    {/* End Date */}
                    <div>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '5px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            color: '#495057'
                        }}>
                            End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '2px 6px',
                                border: '1px solid #ced4da',
                                borderRadius: '6px',
                                fontSize: '0.9rem',
                                height: '26px'
                            }}
                        />
                    </div>
                    
                    {/* Bike Type Filter */}
                    <div>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '5px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            color: '#495057'
                        }}>
                            🚲 Bike Type
                        </label>
                        <select
                            value={bikeTypeFilter}
                            onChange={(e) => setBikeTypeFilter(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '2px 6px',
                                border: '1px solid #ced4da',
                                borderRadius: '6px',
                                fontSize: '0.9rem',
                                backgroundColor: 'white',
                                height: '26px'
                            }}
                        >
                            <option value="all">All Types</option>
                            <option value="standard">Standard</option>
                            <option value="electric">E-Bike</option>
                        </select>
                    </div>
                </div>
                
                {/* Action Buttons */}
                <div style={{ 
                    display: 'flex', 
                    gap: '10px',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                    <button
                        onClick={handleClearFilters}
                        disabled={loading}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        ✖️ Clear Filters
                    </button>
                </div>
            </div>
            
            {/* Results */}
            {loading && <p>Loading ride history...</p>}
            {error && <p style={{ color: '#dc3545' }}>{error}</p>}
            
            {rides.length === 0 && !loading && !error && (
                <p style={{ fontStyle: 'italic', color: '#6c757d', textAlign: 'center', padding: '20px' }}>
                    No rides found matching your filters. Try adjusting your search criteria.
                </p>
            )}
            
            {/* Rides List */}
            {rides.length > 0 && (
                <div>
                    <p style={{ 
                        marginBottom: '15px',
                        fontSize: '0.95rem',
                        color: '#495057',
                        fontWeight: 'bold'
                    }}>
                        Found {rides.length} ride{rides.length !== 1 ? 's' : ''}
                    </p>
                    
                    {rides.map(ride => (
                        <div key={ride.id} style={{
                            backgroundColor: 'white',
                            border: '2px solid #e9ecef',
                            borderRadius: '12px',
                            padding: '20px',
                            marginBottom: '15px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            {/* Header with Trip ID */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '15px',
                                paddingBottom: '12px',
                                borderBottom: '2px solid #e9ecef'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <span style={{
                                        padding: '6px 14px',
                                        backgroundColor: '#6f42c1',
                                        color: 'white',
                                        borderRadius: '20px',
                                        fontSize: '0.85rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {ride.tripId}
                                    </span>
                                    <span style={{
                                        fontSize: '1.1rem',
                                        fontWeight: 'bold'
                                    }}>
                                        🚲 {ride.bikeId}
                                    </span>
                                    <span style={{
                                        padding: '4px 12px',
                                        backgroundColor: ride.bikeType === 'electric' ? '#007bff' : '#6c757d',
                                        color: 'white',
                                        borderRadius: '15px',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {ride.bikeType === 'electric' ? 'E-Bike' : 'Standard'}
                                    </span>
                                </div>
                                <div style={{
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold',
                                    color: ride.bikeType === 'electric' ? '#1976d2' : '#28a745'
                                }}>
                                    ${ride.cost.toFixed(2)}
                                </div>
                            </div>
                            
                            {/* Trip Details */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '15px',
                                fontSize: '0.9rem'
                            }}>
                                <div>
                                    <strong>From:</strong><br/>
                                    {ride.startStation}
                                </div>
                                <div>
                                    <strong>To:</strong><br/>
                                    {ride.endStation}
                                </div>
                                <div>
                                    <strong>Duration:</strong><br/>
                                    {ride.duration.formatted}
                                </div>
                                <div>
                                    <strong>Date:</strong><br/>
                                    {new Date(ride.endTime).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Helper for notification icons
const getNotificationIcon = (type) => {
    switch (type) {
        case 'station_empty':
            return 'Empty';
        case 'station_full':
            return 'Full';
        default:
            return '';
    }
};
// Helper for notification title
const getNotificationTitle = (type, stationName) => {
    switch (type) {
        case 'station_empty':
            return `Station Empty: ${stationName}`;
        case 'station_full':
            return `Station Full: ${stationName}`;
        default:
            return stationName || 'Notification';
    }
};
// Helper for notification time formatting
const formatNotificationTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

const Billing = ({ userId }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [billing, setBilling] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [localFlexBalance, setLocalFlexBalance] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState(null);

    const fetchLocalFlexBalance = useCallback(async () => {
        if (!user?.id) return;
        try {
            const resp = await fetch('http://localhost:5001/api/flex-dollars/balance', {
                headers: {
                    'x-user-id': String(user.id),
                    'x-user-role': String(user?.role || localStorage.getItem('userRole') || 'rider'),
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                }
            });
            const data = await resp.json();
            if (data && data.success) setLocalFlexBalance(data.balance || 0);
        } catch (e) {
            console.warn('Billing.fetchLocalFlexBalance error:', e);
        }
    }, [user?.id, user?.role]);

    const fetchPaymentMethod = useCallback(async () => {
        if (!userId) return;
        try {
            const resp = await fetch(`http://localhost:5001/api/payment-methods/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                }
            });
            const data = await resp.json();
            if (data.success && data.paymentMethod) {
                setPaymentMethod(data.paymentMethod);
            }
        } catch (err) {
            console.error('Error fetching payment method:', err);
        }
    }, [userId]);

    const fetchBilling = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        setError('');
        try {
            const resp = await fetch(`http://localhost:5001/api/users/${userId}/billing?limit=50`, {
                headers: {
                    'x-user-id': String(user?.id || ''),
                    'x-user-role': String(user?.role || ''),
                    'x-username': user?.username || ''
                }
            });
            const data = await resp.json();
            if (data.success) {
                setBilling(data.billing || []);
                // Refresh this component's flex dollars balance
                fetchLocalFlexBalance();
            } else {
                setError(data.message || 'Failed to load billing history');
            }
        } catch (err) {
            console.error('Error fetching billing:', err);
            setError('Error loading billing history');
        } finally {
            setLoading(false);
        }
    }, [userId, user, fetchLocalFlexBalance]);

    useEffect(() => { 
        fetchBilling();
        fetchPaymentMethod();
    }, [fetchBilling, fetchPaymentMethod]);
    
    // Compute totals - only include unpaid rentals
    const totalCost = billing.reduce((sum, it) => {
        // If amountDueAfterFlex exists and is 0, the rental is paid
        const isPaid = it.amountDueAfterFlex !== null && it.amountDueAfterFlex !== undefined && Number(it.amountDueAfterFlex) === 0;
        return sum + (isPaid ? 0 : (Number(it.totalCost) || 0));
    }, 0);
    
    const availableFlex = Number(localFlexBalance) || 0; // user's balance fetched locally
    // We'll apply up to the available flex dollars against the total outstanding
    const totalFlexApplied = Math.min(availableFlex, totalCost);
    const totalAmountDueAfterFlex = Math.max(0, totalCost - totalFlexApplied);
    // Dual users receive a 20% discount on the payment amount (applies after flex)
    const isDual = user?.role === 'dual';
    const dualDiscountRate = isDual ? 0.20 : 0;
    const dualDiscountAmount = isDual ? +(totalAmountDueAfterFlex * dualDiscountRate) : 0;
    const finalAmountDue = Math.max(0, +(totalAmountDueAfterFlex - dualDiscountAmount));
    
    const handlePayTotal = () => {
        // Get all unpaid rental IDs
        const unpaidRentalIds = billing
            .filter(item => {
                const isPaid = item.amountDueAfterFlex !== null && item.amountDueAfterFlex !== undefined && Number(item.amountDueAfterFlex) === 0;
                return !isPaid && Number(item.totalCost || 0) > 0;
            })
            .map(item => item.rentalId);
        
        const selectedPlan = { 
            title: 'Outstanding Charges', 
            price: `$${finalAmountDue.toFixed(2)}`, 
            amount: finalAmountDue,
            originalAmount: totalCost,
            flexApplied: totalFlexApplied,
            dualDiscount: dualDiscountAmount,
            rentalIds: unpaidRentalIds, // Pass array of rental IDs
            isBatchPayment: true
        };
        navigate('/payment', { state: { selectedPlan } });
    };
    
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
                <div>
                    <button onClick={fetchBilling} disabled={loading} style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: '#007bff', color: 'white', border: 'none' }}>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {error && <div style={{ color: '#dc3545', marginTop: 12 }}>{error}</div>}

            {/* Payment Method Section */}
            {paymentMethod && (
                <div style={{ 
                    marginTop: 16, 
                    marginBottom: 20,
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                    borderRadius: '12px',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', fontWeight: '600' }}> Payment Method</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ fontSize: '2.5rem' }}></div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: '600', letterSpacing: '2px', marginBottom: '6px' }}>
                                •••• •••• •••• {paymentMethod.card_number_last4}
                            </div>
                            <div style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '4px', textTransform: 'uppercase' }}>
                                {paymentMethod.card_holder_name}
                            </div>
                            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                                Expires: {paymentMethod.expiry_date}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>Original Outstanding</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#343a40', marginTop: 4 }}>${totalCost.toFixed(2)}</div>
                </div>

                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>Flex Dollars</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0d6efd', marginTop: 4 }}>
                        {availableFlex > 0 ? `- $${availableFlex.toFixed(2)}` : '$0.00'}
                    </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>Amount After Flex</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: totalAmountDueAfterFlex > 0 ? '#d9534f' : '#198754', marginTop: 6 }}>${totalAmountDueAfterFlex.toFixed(2)}</div>
                </div>

                {isDual && (
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>Dual Discount (20%)</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#198754', marginTop: 4 }}>
                            - ${dualDiscountAmount.toFixed(2)}
                        </div>
                    </div>
                )}

                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>Final Amount Due</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: finalAmountDue > 0 ? '#d9534f' : '#198754', marginTop: 6 }}>${finalAmountDue.toFixed(2)}</div>
                </div>

                <div style={{ marginTop: 6 }}>
                    <button onClick={handlePayTotal} disabled={totalAmountDueAfterFlex <= 0} style={{ padding: '10px 16px', borderRadius: 8, backgroundColor: '#198754', color: 'white', border: 'none' }}>
                        {totalAmountDueAfterFlex <= 0 ? '✓ Fully Covered' : 'Pay Total'}
                    </button>
                </div>
            </div>

            <div style={{ marginTop: 16 }}>
                {billing.map(item => (
                    <div key={item.rentalId} style={{ padding: 12, marginBottom: 10, background: 'white', borderRadius: 8, border: '1px solid #e9ecef' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700 }}>🚲 {item.bikeId} <span style={{ fontWeight: 400, color: '#6c757d' }}>{item.bikeType}</span></div>
                                <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>{new Date(item.startTime).toLocaleString()} → {item.endTime ? new Date(item.endTime).toLocaleString() : '—'}</div>
                                <div style={{ marginTop: 6, fontSize: '0.9rem' }}><strong>From:</strong> {item.originStation?.name || item.originStation?.id || 'Unknown'} <span style={{ marginLeft: 12 }}><strong>To:</strong> {item.arrivalStation?.name || item.arrivalStation?.id || 'Unknown'}</span></div>
                                
                                {/* (Flex Dollars Applied display removed per request) */}
                            </div>
                            <div style={{ textAlign: 'right', marginLeft: 12 }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>${item.totalCost != null ? Number(item.totalCost).toFixed(2) : '—'}</div>
                                {/* per-item saved display removed */}
                                <div style={{ marginTop: 8 }}>
                                    {(() => {
                                        // If payment exists (amountDueAfterFlex is not null), use it; otherwise calculate
                                        const isPaid = item.amountDueAfterFlex !== null && item.amountDueAfterFlex !== undefined;
                                        const amountDue = isPaid ? Number(item.amountDueAfterFlex) : Math.max(0, Number(item.totalCost || 0) - (Number(item.flexDollarsApplied) || 0));
                                        
                                        return (
                                            <button 
                                                onClick={() => navigate('/payment', { 
                                                    state: { 
                                                        selectedPlan: { 
                                                            title: `Rental ${item.rentalId}`, 
                                                            price: `$${amountDue.toFixed(2)}`, 
                                                            amount: amountDue,
                                                            originalAmount: Number(item.totalCost) || 0,
                                                            rentalId: item.rentalId
                                                        } 
                                                    } 
                                                })} 
                                                disabled={amountDue <= 0} 
                                                style={{ 
                                                    padding: '8px 10px', 
                                                    borderRadius: 8, 
                                                    backgroundColor: amountDue <= 0 ? '#198754' : '#007bff', 
                                                    color: 'white', 
                                                    border: 'none',
                                                    cursor: amountDue <= 0 ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {amountDue <= 0 ? '✓ Paid' : `Pay $${amountDue.toFixed(2)}`}
                                            </button>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Account Information Component
const AccountInformation = ({ userId, userRole, loyaltyTier, flexDollarsBalance, selectedRole, onRoleChange, onViewChange }) => {
    // Loyalty tier info
    const loyaltyTiers = {
        'None': { icon: '', color: '#6c757d', perks: 'No perks' },
        'Bronze': { icon: '', color: '#CD7F32', perks: '5% discount on trips' },
        'Silver': { icon: '', color: '#C0C0C0', perks: '10% discount on trips + 2-minute reservation hold' },
        'Gold': { icon: '', color: '#FFD700', perks: '15% discount on trips + 5-minute reservation hold' }
    };

    const currentTier = loyaltyTiers[loyaltyTier] || loyaltyTiers['None'];
    const isDualRole = userRole === 'operator' || userRole === 'dual';

    const badgeColor = currentTier.color;
    const tierBadgeStyle = {
        display: 'inline-block',
        padding: '12px 20px',
        borderRadius: '8px',
        backgroundColor: badgeColor,
        color: 'white',
        fontWeight: 'bold',
        fontSize: '18px',
        marginRight: '15px',
        marginBottom: '15px',
        textAlign: 'center',
        minWidth: '150px'
    };

    const infoBoxStyle = {
        padding: '20px',
        backgroundColor: '#e8f4f8',
        border: '2px solid #17a2b8',
        borderRadius: '8px',
        marginBottom: '20px'
    };

    const labelStyle = {
        fontWeight: 'bold',
        color: '#0c5460',
        marginBottom: '8px',
        display: 'block'
    };

    const valueStyle = {
        fontSize: '16px',
        color: '#0c5460',
        marginBottom: '15px'
    };

    return (
        <div>
            {/* Loyalty Program Section */}
            <div style={infoBoxStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#0c5460' }}> Loyalty Program</h3>
                <div style={tierBadgeStyle}>
                    {currentTier.icon} {loyaltyTier}
                </div>
                <div style={valueStyle}>
                    <strong>Perks:</strong> {currentTier.perks}
                </div>
                <div style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                    Complete more rides to unlock higher tiers and earn exclusive benefits!
                </div>
            </div>

            {/* Flex Dollars Section  */}
            <div style={infoBoxStyle}>
                <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#0c5460' }}> Flex Dollars</h3>
                <div style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#155724',
                    marginBottom: '10px'
                }}>
                    ${flexDollarsBalance.toFixed(2)}
                </div>
                <div style={valueStyle}>
                    Earn flex dollars by returning bikes to stations below 25% capacity. 
                    They're automatically applied to your trips and never expire!
                </div>
                <div style={{ marginTop: '12px' }}>
                    <button
                        onClick={() => { if (typeof onViewChange === 'function') { onViewChange('flex-dollars-history'); } else { window.location.hash = '#flex-dollars-history'; } }}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: loyaltyTier === 'None' ? '#6c757d' : '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        View History
                    </button>
                </div>
            </div>



            {/* Role Display Section (if dual role) */}
            {isDualRole && (
                <div style={infoBoxStyle}>
                    <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#0c5460' }}> Account Role</h3>
                    <div style={labelStyle}>Currently Viewing As:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{
                            padding: '10px 15px',
                            borderRadius: '6px',
                            border: '2px solid #007bff',
                            fontSize: '16px',
                            backgroundColor: '#e7f3ff',
                            fontWeight: 'bold',
                            color: '#007bff'
                        }}>
                            {selectedRole === 'rider' ? ' Rider' : ' Operator'}
                        </div>
                        <div style={{ color: '#666', fontSize: '14px', textAlign: 'center', maxWidth: '560px' }}>
                            {selectedRole === 'rider' 
                                ? 'You can rent bikes, view ride history, and earn flex dollars.' 
                                : 'You can manage bikes, perform maintenance, and rebalance the network.'}
                        </div>
                        <div style={{ color: '#999', fontSize: '12px', fontStyle: 'italic', textAlign: 'center' }}>
                            Switch views using the navbar dropdown
                        </div>
                    </div>
                </div>
            )}

            {/* Account Details Section */}
            <div style={infoBoxStyle}>
                <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#0c5460' }}> Account Details</h3>
                <div style={valueStyle}>
                    <strong>Account Type:</strong> {userRole === 'rider' ? ' Rider' : userRole === 'operator' ? ' Operator' : ' ' + userRole}
                </div>
                <div style={valueStyle}>
                    <strong>User ID:</strong> {userId}
                </div>
            </div>
        </div>
    );
};

// Flex Dollars History Component (DM-03, DM-04)
const FlexDollarsHistory = ({ userId, userRole }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchTransactionHistory = useCallback(async () => {
        if (!userId) return;

        try {
            setLoading(true);
            setError('');

            const response = await fetch(`http://localhost:5001/api/flex-dollars/history?limit=50&offset=0`, {
                headers: {
                    'x-user-id': String(userId),
                    'x-user-role': String(userRole || localStorage.getItem('userRole') || 'rider'),
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                }
            });
            const data = await response.json();

            if (data.success) {
                setTransactions(data.transactions || []);
            } else {
                setError('Failed to load flex dollars history');
            }
        } catch (err) {
            console.error('Error fetching flex dollars history:', err);
            setError('Error loading transaction history');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchTransactionHistory();
    }, [fetchTransactionHistory]);

    if (loading) return <div>Loading flex dollars history...</div>;

    return (
        <div style={{ marginTop: '20px' }}>
            {error && <div style={{ color: '#dc3545', marginBottom: '10px' }}>{error}</div>}

            {transactions.length === 0 ? (
                <div style={{ color: '#6c757d', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                    No flex dollars transactions yet. Start earning by returning bikes to understocked stations!
                </div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Type</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Description</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Amount</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((transaction, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #dee2e6', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                                <td style={{ padding: '12px' }}>
                                    {new Date(transaction.createdAt).toLocaleDateString()} {new Date(transaction.createdAt).toLocaleTimeString()}
                                </td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        backgroundColor: transaction.type === 'award' ? '#d4edda' : 
                                                       transaction.type === 'deduct' ? '#f8d7da' : '#e2e3e5',
                                        color: transaction.type === 'award' ? '#155724' : 
                                               transaction.type === 'deduct' ? '#721c24' : '#383d41'
                                    }}>
                                        {transaction.type === 'award' ? '✓ Award' :
                                         transaction.type === 'deduct' ? '✗ Used' : 'Refund'}
                                    </span>
                                </td>
                                <td style={{ padding: '12px' }}>{transaction.description}</td>
                                <td style={{ 
                                    padding: '12px', 
                                    textAlign: 'right', 
                                    fontWeight: 'bold',
                                    color: transaction.amount >= 0 ? '#28a745' : '#dc3545'
                                }}>
                                    {transaction.amount >= 0 ? '+' : ''} ${Math.abs(transaction.amount).toFixed(2)}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                                    ${transaction.balanceAfter.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};


const Profile = () => {
    // Notifications state
    const [stationNotifications, setStationNotifications] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const [notifError, setNotifError] = useState('');

    // Flex Dollars state
    const [flexDollarsBalance, setFlexDollarsBalance] = useState(0);

    // Fetch flex dollars balance
    const fetchFlexDollarsBalance = async (userId) => {
        try {
            const response = await fetch('http://localhost:5001/api/flex-dollars/balance', {
                headers: {
                    'x-user-id': String(userId),
                    'x-user-role': String(user?.role || localStorage.getItem('userRole') || 'rider'),
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setFlexDollarsBalance(data.balance);
            }
        } catch (err) {
            console.error('Error fetching flex dollars balance:', err);
        }
    };

    // Fetch station notifications
    const fetchStationNotifications = async () => {
        setNotifLoading(true);
        setNotifError('');
        try {
            const response = await fetch('http://localhost:5001/api/notifications/stations');
            const data = await response.json();
            if (data.success) {
                setStationNotifications(data.notifications);
            } else {
                setNotifError('Failed to load station notifications');
            }
        } catch (err) {
            setNotifError('Error loading station notifications');
        } finally {
            setNotifLoading(false);
        }
    };


    const { user, login } = useAuth();

    // Check if this is an existing user without profile information
    const hasIncompleteProfile = !user?.firstName || !user?.lastName || !user?.email;

    // Loyalty Tier state
    const [loyaltyTier, setLoyaltyTier] = useState('Entry');
    
    // Initialize selectedRole from localStorage for dual users
    const [selectedRole, setSelectedRole] = useState(() => {
        if (user?.role === 'dual') {
            try {
                return localStorage.getItem('dual_view') || 'operator';
            } catch (e) {
                return 'operator';
            }
        }
        return user?.role || 'rider';
    });

    // Listen for view changes from navbar
    useEffect(() => {
        if (user?.role === 'dual') {
            const handler = (e) => {
                if (e && e.detail) {
                    setSelectedRole(e.detail);
                }
            };
            window.addEventListener('dualViewChange', handler);
            return () => window.removeEventListener('dualViewChange', handler);
        }
    }, [user?.role]);

    // Handle role changes from AccountInformation — persist for dual users
    const handleRoleChange = (role) => {
        setSelectedRole(role);
        try {
            localStorage.setItem('dual_view', role);
        } catch (e) {}
        window.dispatchEvent(new CustomEvent('dualViewChange', { detail: role }));
        showRoleChangeMessage(role);
    };

    // Show a small confirmation message when role/view changes
    const showRoleChangeMessage = (role) => {
        try {
            setMessageType('success');
            setMessage(`View updated — now viewing as ${role === 'rider' ? 'Rider' : 'Operator'}.`);
            setTimeout(() => {
                setMessage('');
                setMessageType('');
            }, 3000);
        } catch (e) {
            // ignore
        }
    };

    // Declare currentView before any useEffect that uses it
    const [currentView, setCurrentView] = useState(hasIncompleteProfile ? 'edit' : 'profile'); // profile, edit, history, notifications, account
    const [isEditing, setIsEditing] = useState(hasIncompleteProfile);
    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        address: user?.address || ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    // Fetch notifications when notifications view is opened
    useEffect(() => {
        if (currentView === 'notifications') {
            fetchStationNotifications();
        }
    }, [currentView]);

    // Fetch flex dollars balance when profile is loaded
    useEffect(() => {
        if (user?.id) {
            fetchFlexDollarsBalance(user.id);
        }
    }, [user?.id]);

    // Initialize view based on profile completeness
    useEffect(() => {
        if (hasIncompleteProfile) {
            setCurrentView('edit');
            setIsEditing(true);
        }
    }, [hasIncompleteProfile, setIsEditing]);

    // Fetch loyalty tier from server and update local state
    const fetchLoyaltyTier = useCallback(async () => {
        if (!user?.id) return;
        
        try {
            const response = await fetch(`http://localhost:5001/api/users/${user.id}/loyalty`, {
                headers: {
                    'x-user-id': String(user.id),
                    'x-user-role': String(user?.role || localStorage.getItem('userRole') || 'rider'),
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                }
            });
            const data = await response.json();
            
            if (data.success && data.loyalty && data.loyalty.currentTier) {
                // Convert to proper casing: 'bronze' -> 'Bronze', 'none' -> 'None'
                const tierName = data.loyalty.currentTier.toLowerCase() === 'none' 
                    ? 'None' 
                    : data.loyalty.currentTier.charAt(0).toUpperCase() + data.loyalty.currentTier.slice(1).toLowerCase();
                setLoyaltyTier(tierName);
            }
        } catch (error) {
            console.error('Error fetching loyalty tier:', error);
        }
    }, [user?.id, user?.role]);

    // Initialize loyalty tier from user context or fetch from server
    useEffect(() => {
        if (user?.loyaltyTier) {
            // Convert to proper casing: 'bronze' -> 'Bronze', 'none' -> 'None'
            const tierName = user.loyaltyTier.toLowerCase() === 'none' 
                ? 'None' 
                : user.loyaltyTier.charAt(0).toUpperCase() + user.loyaltyTier.slice(1).toLowerCase();
            setLoyaltyTier(tierName);
        } else {
            fetchLoyaltyTier();
        }
    }, [user?.id, user?.loyaltyTier, fetchLoyaltyTier]);

    // Listen for loyalty tier updates from other components (after return bike, etc)
    useEffect(() => {
        const handleTierUpdate = (event) => {
            // The tier has been updated via context/localStorage, 
            // component will re-render automatically from context change
            console.log('Loyalty tier updated:', event.detail);
            fetchLoyaltyTier();
        };

        window.addEventListener('tierUpdated', handleTierUpdate);
        return () => window.removeEventListener('tierUpdated', handleTierUpdate);
    }, [fetchLoyaltyTier]);


    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSave = async () => {
        setIsLoading(true);
        setMessage('');

        // Validate required fields
        if (!formData.firstName || !formData.lastName || !formData.email) {
            setMessage('First name, last name, and email are required');
            setIsLoading(false);
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setMessage('Please enter a valid email address');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:5001/api/profile/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    address: formData.address
                }),
            });

            const data = await response.json();

            if (data.success) {
                setMessage('Profile updated successfully!');
                setIsEditing(false);
                // Update the user context with new data
                login(data.user);
                // Return to profile view if profile was complete
                if (!hasIncompleteProfile) {
                    setTimeout(() => setCurrentView('profile'), 2000);
                }
            } else {
                setMessage(data.message || 'Error updating profile');
            }
        } catch (error) {
            setMessage('Error connecting to server');
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Styles
    const containerStyle = {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif"
    };

    const sidebarStyle = {
        width: '300px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255, 255, 255, 0.2)'
    };

    const mainContentStyle = {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
    };

    const profileCardStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        width: '100%',
        maxWidth: '600px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
    };

    const titleStyle = {
        textAlign: 'center',
        marginBottom: '30px',
        fontSize: '2.5rem',
        fontWeight: '700',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    };

    const fieldGroupStyle = {
        marginBottom: '20px'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600',
        color: '#333',
        fontSize: '0.95rem'
    };

    const displayValueStyle = {
        padding: '15px 20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        fontSize: '1rem',
        color: '#333',
        minHeight: '20px'
    };

    const inputStyle = {
        width: '100%',
        padding: '15px 20px',
        border: '2px solid rgba(102, 126, 234, 0.2)',
        borderRadius: '12px',
        fontSize: '1rem',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        transition: 'all 0.3s ease',
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box'
    };

    const buttonGroupStyle = {
        display: 'flex',
        gap: '15px',
        marginTop: '30px'
    };

    const buttonStyle = {
        flex: '1',
        padding: '15px 25px',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        border: 'none',
        opacity: isLoading ? 0.7 : 1
    };

    const primaryButtonStyle = {
        ...buttonStyle,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
    };

    const secondaryButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#6c757d',
        color: 'white'
    };

    const messageStyle = {
        padding: '12px 20px',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center',
        fontWeight: '500',
        backgroundColor: messageType === 'success' ? '#d4edda' : '#f8d7da',
        color: messageType === 'success' ? '#155724' : '#721c24',
        border: `1px solid ${messageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`
    };

    const sidebarTitleStyle = {
        color: 'white',
        fontSize: '1.8rem',
        fontWeight: '700',
        marginBottom: '30px',
        textAlign: 'center',
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
    };

    const sidebarButtonStyle = {
        width: '100%',
        padding: '15px 20px',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: 'none',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: 'white',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
        transform: 'translateY(0)'
    };

    const activeSidebarButtonStyle = {
        ...sidebarButtonStyle,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
        transform: 'translateY(-2px)'
    };

    const notificationsStyle = {
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef'
    };

    const notificationItemStyle = {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '15px',
        padding: '15px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        marginBottom: '10px',
        border: '1px solid #dee2e6',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    };

    const notificationIconStyle = {
        fontSize: '1.5rem',
        minWidth: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e9ecef',
        borderRadius: '50%'
    };

    const notificationTitleStyle = {
        fontWeight: '600',
        color: '#333',
        marginBottom: '4px'
    };

    const notificationTextStyle = {
        color: '#6c757d',
        fontSize: '0.9rem',
        marginBottom: '6px'
    };

    const notificationTimeStyle = {
        color: '#adb5bd',
        fontSize: '0.8rem'
    };

    if (!user) {
        return (
            <div style={containerStyle}>
                <div style={profileCardStyle}>
                    <h2 style={titleStyle}>Please log in to view your profile</h2>
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            {/* Sidebar Navigation */}
            <div style={sidebarStyle}>
                <h2 style={sidebarTitleStyle}>Profile Menu</h2>
                
                <button
                    onClick={() => setCurrentView('profile')}
                    style={currentView === 'profile' ? activeSidebarButtonStyle : {...sidebarButtonStyle, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}
                >
                    My Profile
                </button>
                
                <button
                    onClick={() => {
                        setCurrentView('edit');
                        setIsEditing(true);
                        setMessage('');
                    }}
                    style={currentView === 'edit' ? activeSidebarButtonStyle : {...sidebarButtonStyle, background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'}}
                >
                    Edit Profile
                </button>
                
                <button
                    onClick={() => setCurrentView('account')}
                    style={currentView === 'account' ? activeSidebarButtonStyle : {...sidebarButtonStyle, background: 'linear-gradient(135deg, #FF6B35 0%, #D84315 100%)'}}
                >
                    Account Information
                </button>
                
                <button
                    onClick={() => setCurrentView('history')}
                    style={currentView === 'history' ? activeSidebarButtonStyle : {...sidebarButtonStyle, background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'}}
                >
                    Ride History
                </button>
                
                <button
                    onClick={() => setCurrentView('billing')}
                    style={currentView === 'billing' ? activeSidebarButtonStyle : {...sidebarButtonStyle, background: 'linear-gradient(135deg, #6f42c1 0%, #5a32a8 100%)'}}
                >
                    Billing
                </button>
                
                <button
                    onClick={() => setCurrentView('notifications')}
                    style={currentView === 'notifications' ? activeSidebarButtonStyle : {...sidebarButtonStyle, background: 'linear-gradient(135deg, #ff7b7b 0%, #ff6b6b 100%)'}}
                >
                    Notifications
                </button>
            </div>

            {/* Main Content Area */}
            <div style={mainContentStyle}>
                <div style={profileCardStyle}>
                    {/* Profile View */}
                    {currentView === 'profile' && (
                        <>
                            <h2 style={titleStyle}>My Profile Information</h2>
                            
                            {hasIncompleteProfile && (
                                <div style={{
                                    ...messageStyle,
                                    backgroundColor: '#fff3cd',
                                    color: '#856404',
                                    border: '1px solid #ffeaa7'
                                }}>
                                    Complete your profile information to get the most out of your BikeShare experience!
                                </div>
                            )}

                            <div style={fieldGroupStyle}>
                                <label style={labelStyle}>First Name</label>
                                <div style={displayValueStyle}>
                                    {user.firstName || 'Not provided'}
                                </div>
                            </div>

                            <div style={fieldGroupStyle}>
                                <label style={labelStyle}>Last Name</label>
                                <div style={displayValueStyle}>
                                    {user.lastName || 'Not provided'}
                                </div>
                            </div>

                            <div style={fieldGroupStyle}>
                                <label style={labelStyle}>Email Address</label>
                                <div style={displayValueStyle}>
                                    {user.email || 'Not provided'}
                                </div>
                            </div>

                            <div style={fieldGroupStyle}>
                                <label style={labelStyle}>Address</label>
                                <div style={displayValueStyle}>
                                    {user.address || 'Not provided'}
                                </div>
                            </div>

                            <div style={fieldGroupStyle}>
                                <label style={labelStyle}>Username</label>
                                <div style={displayValueStyle}>
                                    {user.username}
                                </div>
                            </div>

                            <div style={fieldGroupStyle}>
                                <label style={labelStyle}>Role</label>
                                <div style={displayValueStyle}>
                                    {user.role}
                                </div>
                            </div>
                            
    
                        </>
                    )}

                    {/* Flex Dollars History View */}
                    {currentView === 'flex-dollars-history' && (
                        <>
                            <h2 style={titleStyle}>Flex Dollars History</h2>
                            <FlexDollarsHistory userId={user?.id} userRole={user?.role} />
                            <button
                                onClick={() => setCurrentView('account')}
                                style={{
                                    marginTop: '20px',
                                    padding: '10px 20px',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Back to Account Information
                            </button>
                        </>
                    )}

                    {/* Account Information View */}
                    {currentView === 'account' && (
                        <>
                            <h2 style={titleStyle}>Account Information</h2>
                            {message && (
                                <div style={messageStyle}>
                                    {message}
                                </div>
                            )}
                            <AccountInformation 
                                userId={user?.id} 
                                userRole={user?.role}
                                loyaltyTier={loyaltyTier}
                                flexDollarsBalance={flexDollarsBalance}
                                selectedRole={selectedRole}
                                onRoleChange={handleRoleChange}
                                onViewChange={setCurrentView}
                            />
                        </>
                    )}

                    {/* Edit Profile View */}
                    {currentView === 'edit' && (
                        <>
                            <h2 style={titleStyle}>Edit Profile</h2>
                            
                            {message && (
                                <div style={messageStyle}>
                                    {message}
                                </div>
                            )}

                            <div style={fieldGroupStyle}>
                                <label style={labelStyle}>First Name</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    style={inputStyle}
                                    placeholder="Enter your first name"
                                />
                            </div>

                            <div style={fieldGroupStyle}>
                                <label style={labelStyle}>Last Name</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    style={inputStyle}
                                    placeholder="Enter your last name"
                                />
                            </div>

                            <div style={fieldGroupStyle}>
                                <label style={labelStyle}>Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    style={inputStyle}
                                    placeholder="Enter your email address"
                                />
                            </div>

                            <div style={fieldGroupStyle}>
                                <label style={labelStyle}>Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    style={inputStyle}
                                    placeholder="Enter your address"
                                />
                            </div>

                            <div style={buttonGroupStyle}>
                                <button
                                    onClick={handleSave}
                                    disabled={isLoading}
                                    style={primaryButtonStyle}
                                >
                                    {isLoading ? 'Saving...' : (hasIncompleteProfile ? 'Complete Profile' : 'Save Changes')}
                                </button>
                                {!hasIncompleteProfile && (
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setCurrentView('profile');
                                            setMessage('');
                                        }}
                                        disabled={isLoading}
                                        style={secondaryButtonStyle}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {/* Ride History View */}
                    {currentView === 'history' && (
                        <>
                            <h2 style={titleStyle}>Ride History</h2>
                            <RideHistory userId={user?.id} />
                        </>
                    )}

                    {/* Billing View */}
                    {currentView === 'billing' && (
                        <>
                            <h2 style={titleStyle}>Billing</h2>
                            <Billing userId={user?.id} />
                        </>
                    )}

                    {/* Notifications View */}
                    {currentView === 'notifications' && (
                        <>
                            <h2 style={titleStyle}>Notifications</h2>
                            <div style={notificationsStyle}>
                                {notifLoading && <div>Loading notifications...</div>}
                                {notifError && <div style={{ color: '#dc3545', marginBottom: 10 }}>{notifError}</div>}
                                {stationNotifications.length === 0 && !notifLoading && !notifError && (
                                    <div style={{ color: '#6c757d', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                                        No empty or full docking station notifications at this time.
                                    </div>
                                )}
                                {stationNotifications.map((notif, idx) => (
                                    <div key={notif.stationId + notif.type + idx} style={notificationItemStyle}>
                                        <div style={notificationIconStyle}>{getNotificationIcon(notif.type)}</div>
                                        <div>
                                            <div style={notificationTitleStyle}>{getNotificationTitle(notif.type, notif.stationName)}</div>
                                            <div style={notificationTextStyle}>{notif.message}</div>
                                            <div style={notificationTimeStyle}>{formatNotificationTime(notif.timestamp)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;