import React, { useState, useEffect } from 'react';
import './MyRentals.css';

const MyRentals = () => {
    // Small component to show elapsed time since startTime
    const ElapsedTimer = ({ startTime }) => {
        const [now, setNow] = useState(new Date());

        useEffect(() => {
            const t = setInterval(() => setNow(new Date()), 1000);
            return () => clearInterval(t);
        }, []);

        const start = new Date(startTime).getTime();
        const diff = Math.max(0, now.getTime() - start);

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const pad = (n) => String(n).padStart(2, '0');

        return (
            <div style={{ 
                fontSize: '3.5rem', 
                fontWeight: '900',
                textAlign: 'center',
                color: '#ffffff',
                textShadow: '3px 3px 6px rgba(0,0,0,0.8)',
                fontFamily: 'monospace',
                letterSpacing: '3px',
                padding: '20px 30px',
                background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                borderRadius: '20px',
                border: '4px solid #ffffff',
                boxShadow: '0 10px 30px rgba(231,76,60,0.5), inset 0 2px 10px rgba(255,255,255,0.2)',
                animation: 'pulse 2s infinite',
                marginBottom: '15px',
                transform: 'scale(1.05)'
            }}>
                ⏱️ {pad(hours)}:{pad(minutes)}:{pad(seconds)}
            </div>
        );
    };

    // Cost estimation component
    const CostEstimator = ({ startTime, bikeType }) => {
        const [now, setNow] = useState(new Date());

        useEffect(() => {
            const t = setInterval(() => setNow(new Date()), 1000);
            return () => clearInterval(t);
        }, []);

        const start = new Date(startTime).getTime();
        const diff = Math.max(0, now.getTime() - start);
        const durationMinutes = Math.ceil(diff / (1000 * 60)); // Round up to next minute
        
        // Determine bike type and rate
        const isEbike = bikeType === 'e-bike';
        const ratePerMinute = isEbike ? 0.25 : 0.10;
        const estimatedCost = durationMinutes * ratePerMinute;

        return (
            <div style={{ 
                fontSize: '1.4rem', 
                fontWeight: '600',
                textAlign: 'center',
                color: '#007bff',
                padding: '8px 12px',
                background: 'rgba(0,123,255,0.1)',
                borderRadius: '8px',
                border: '2px solid rgba(0,123,255,0.3)',
                marginTop: '10px'
            }}>
                💰 Estimated Cost: <span style={{color: '#28a745', fontWeight: '800'}}>${estimatedCost.toFixed(2)}</span>
                <div style={{fontSize: '0.9rem', opacity: 0.8, marginTop: '4px'}}>
                    {durationMinutes} min × ${ratePerMinute}/min ({isEbike ? 'E-Bike' : 'Standard'})
                </div>
            </div>
        );
    };

    const [reservations, setReservations] = useState([]);
    const [activeRental, setActiveRental] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showReturnStations, setShowReturnStations] = useState(false);
    const [returnStations, setReturnStations] = useState([]);

    // Timer for countdown updates
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Function to load active rental from localStorage
    const tryLoadActive = () => {
        try {
            const activeRentalData = localStorage.getItem('activeRental');
            console.log('MyRentals: Raw activeRental from localStorage:', activeRentalData);
            
            if (!activeRentalData || activeRentalData === 'null') {
                console.log('MyRentals: No active rental found');
                setActiveRental(null);
                return;
            }

            const ar = JSON.parse(activeRentalData);
            console.log('MyRentals: Parsed active rental:', ar);
            setActiveRental(ar);
        } catch (e) {
            console.log('MyRentals: Error loading active rental:', e);
            setActiveRental(null);
        }
    };

    // Function to fetch active rental from server and validate against local data
    const fetchServerActiveRental = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;

            const response = await fetch(`http://localhost:5001/api/users/${user.id}/rental`);
            const json = await response.json();
            
            if (json && json.success && json.hasActiveRental && json.rental) {
                // Map server rental to client activeRental shape
                const srv = json.rental;
                const mapped = {
                    userId: String(srv.userId || user.id),
                    username: srv.username || user.username,
                    bikeId: srv.bikeId,
                    stationId: srv.stationId,
                    stationName: srv.stationName,
                    startTime: srv.startTime || new Date().toISOString(),
                    status: srv.status || 'active',
                    bikeType: srv.bikeType || 'standard'
                };

                localStorage.setItem('activeRental', JSON.stringify(mapped));
                setActiveRental(mapped);
            } else {
                // No active rental on server, clear any stale local data
                const localActive = JSON.parse(localStorage.getItem('activeRental'));
                if (localActive) {
                    console.log('Clearing stale rental data - no active rental on server');
                    localStorage.removeItem('activeRental');
                    setActiveRental(null);
                    window.dispatchEvent(new Event('activeRentalChanged'));
                }
            }
        } catch (err) {
            console.error('Error fetching server active rental:', err);
            // On error, also clear potentially stale data
            const localActive = JSON.parse(localStorage.getItem('activeRental'));
            if (localActive) {
                console.log('Clearing rental data due to server error');
                localStorage.removeItem('activeRental');
                setActiveRental(null);
                window.dispatchEvent(new Event('activeRentalChanged'));
            }
        }
    };

    // Auto-refresh active rental every 3 seconds, prioritizing server validation
    useEffect(() => {
        const refreshActiveRental = () => {
            // Always fetch from server first to validate/sync data
            fetchServerActiveRental();
        };

        // Refresh immediately and then every 3 seconds
        refreshActiveRental();
        const interval = setInterval(refreshActiveRental, 3000);

        return () => clearInterval(interval);
    }, []);

    // Function to load user's reservations
    const loadReservations = async () => {
        try {
            setLoading(true);
            
            // Get user info from localStorage
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                setError('Please log in to view your reservations');
                return;
            }

            // Get user's reservations directly from the server
            const response = await fetch(`http://localhost:5001/api/users/${user.id}/reservations`);
            const data = await response.json();
            
            if (data.success) {
                setReservations(data.reservations);
            } else {
                setError(data.message || 'Failed to load reservations');
            }
        } catch (err) {
            setError('Network error loading reservations');
            console.error('Error loading reservations:', err);
        } finally {
            setLoading(false);
        }
    };

    // Load user's reservations on component mount
    useEffect(() => {

        loadReservations();

        // Load active rental from server (which will validate and sync with localStorage)
        fetchServerActiveRental();

        // Listen for changes in other tabs (storage) and same-tab custom events
        const handler = (event) => {
            console.log('MyRentals: Event received:', event.type, event);
            fetchServerActiveRental(); // Always validate with server
            // Also refresh reservations when rental changes (in case we rented from a reservation)
            if (event.type === 'activeRentalChanged') {
                loadReservations();
            }
        };
        
        const storageHandler = (event) => {
            console.log('MyRentals: Storage event received:', event.key, event.newValue);
            if (event.key === 'activeRental') {
                fetchServerActiveRental(); // Always validate with server
            }
        };

        window.addEventListener('storage', storageHandler);
        window.addEventListener('activeRentalChanged', handler);

        return () => {
            window.removeEventListener('storage', storageHandler);
            window.removeEventListener('activeRentalChanged', handler);
        };
    }, []);

    // Calculate time remaining for reservation
    const getTimeRemaining = (expiryTime) => {
        const now = currentTime.getTime();
        const expiry = new Date(expiryTime).getTime();
        const remaining = expiry - now;
        
        if (remaining <= 0) {
            return { text: 'EXPIRED', color: '#e74c3c', expired: true };
        }
        
        const minutes = Math.floor(remaining / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        const color = minutes <= 5 ? '#e74c3c' : minutes <= 10 ? '#f39c12' : '#27ae60';
        
        return { text: timeText, color, expired: false };
    };

    // Cancel reservation
    const cancelReservation = async (stationId, bikeId) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                alert('Please log in to cancel reservation');
                return;
            }

            const response = await fetch('http://localhost:5001/api/reserve/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id,
                    'x-user-role': user.role,
                    'x-username': user.username
                },
                body: JSON.stringify({ stationId, bikeId })
            });

            const data = await response.json();
            
            if (data.success) {
                // Remove from local reservations
                setReservations(prev => prev.filter(r => r.bikeId !== bikeId));
                alert(`Reservation cancelled for bike ${bikeId}`);
            } else {
                alert(`Failed to cancel reservation: ${data.message}`);
            }
        } catch (err) {
            console.error('Cancel reservation error:', err);
            alert('Network error during cancellation');
        }
    };

    // Rent a reserved bike
    const rentReservedBike = async (stationId, bikeId) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                alert('Please log in to rent a bike');
                return;
            }

            const response = await fetch('http://localhost:5001/api/rent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id,
                    'x-user-role': user.role,
                    'x-username': user.username
                },
                body: JSON.stringify({ stationId, bikeId, userId: String(user.id) })
            });

            const data = await response.json();
            
            if (data.success) {
                // Create active rental object
                const newActiveRental = {
                    userId: String(user.id),
                    username: user.username,
                    bikeId: bikeId,
                    stationId: stationId,
                    stationName: data.stationName || 'Unknown Station',
                    startTime: new Date().toISOString(),
                    status: 'active',
                    bikeType: data.bikeType || 'standard'
                };

                // Store active rental in localStorage
                localStorage.setItem('activeRental', JSON.stringify(newActiveRental));
                setActiveRental(newActiveRental);

                // Remove from reservations
                setReservations(prev => prev.filter(r => r.bikeId !== bikeId));

                // Notify other components
                window.dispatchEvent(new Event('activeRentalChanged'));
                window.dispatchEvent(new StorageEvent('storage', { key: 'activeRental', newValue: JSON.stringify(newActiveRental) }));

                // Dispatch event to notify activity history to refresh
                window.dispatchEvent(new CustomEvent('rentalStarted', {
                    detail: { bikeId, stationId, stationName: data.stationName }
                }));
                
                alert(`Successfully rented bike ${bikeId}! Your rental has started.`);
            } else {
                alert(`Failed to rent bike: ${data.message}`);
            }
        } catch (err) {
            console.error('Rent reserved bike error:', err);
            alert('Network error during rental');
        }
    };

    // Show available return stations
    const showReturnOptions = async () => {
        console.log('Return Bike button clicked!');
        console.log('ActiveRental:', activeRental);
        
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !activeRental) {
                alert('No active rental or not logged in');
                return;
            }

            setLoading(true);
            
            // Fetch all stations to find ones with available docks
            const response = await fetch('http://localhost:5001/api/stations/map');
            const data = await response.json();
            
            if (data.success) {
                // Filter stations that have available docks for returning
                const availableStations = data.stations.filter(station => 
                    station.freeDocks > 0 && station.freeDockIds && station.freeDockIds.length > 0
                );
                
                setReturnStations(availableStations);
                setShowReturnStations(true);
                
                console.log('Found', availableStations.length, 'stations with available docks');
            } else {
                alert('Failed to load station information. Please try again.');
            }
        } catch (err) {
            console.error('Error loading return stations:', err);
            alert('Network error loading return options. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Return bike to specific station and dock
    const returnBikeToStation = async (stationId, dockId, stationName) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !activeRental) {
                alert('No active rental or not logged in');
                return;
            }

            const response = await fetch('http://localhost:5001/api/return', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id,
                    'x-user-role': user.role,
                    'x-username': user.username
                },
                body: JSON.stringify({ 
                    stationId: stationId, 
                    bikeId: activeRental.bikeId, 
                    userId: String(user.id) 
                })
            });

            const data = await response.json();
            
            if (data.success) {
                // Calculate rental duration for summary
                const startTime = new Date(activeRental.startTime);
                const endTime = new Date();
                const durationMs = endTime.getTime() - startTime.getTime();
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

                alert(
                    `✅ Bike ${activeRental.bikeId} successfully returned to ${stationName}!\n\n` +
                    `📊 Rental Summary:\n` +
                    `⏱️ Duration: ${hours}h ${minutes}m\n` +
                    `📍 Returned to: ${stationName} (Dock ${dockId})\n` +
                    `💰 Final cost will be calculated based on your rental duration.`
                );
                
                // Clear local active rental
                localStorage.removeItem('activeRental');
                
                // Notify other components
                window.dispatchEvent(new Event('activeRentalChanged'));
                window.dispatchEvent(new StorageEvent('storage', { key: 'activeRental', newValue: null }));
                
                setActiveRental(null);
                setShowReturnStations(false);
                setReturnStations([]);
                
                // Dispatch event to notify activity history to refresh
                window.dispatchEvent(new CustomEvent('rentalEnded', {
                    detail: { 
                        bikeId: activeRental.bikeId, 
                        stationId, 
                        stationName,
                        duration: { hours, minutes }
                    }
                }));
                
                console.log('Bike returned successfully, activeRental cleared');
            } else {
                alert(`❌ Failed to return bike: ${data.message}\n\nPlease try again or contact support.`);
                console.error('Return failed:', data);
            }
        } catch (err) {
            console.error('Return error:', err);
            alert('❌ Network error during return. Please check your connection and try again.');
        }
    };

    // Cancel return mode
    const cancelReturn = () => {
        setShowReturnStations(false);
        setReturnStations([]);
    };

    return (
        <div className="my-rentals-container">
            <div className="header">
                <h1>📋 My Rentals & Reservations</h1>
                <p>Manage your active bike reservations and rentals</p>
            </div>

            {loading && <div className="loading">Loading your reservations...</div>}
            {error && <div className="error">{error}</div>}

            {!loading && !error && (
                <>
                    {/* Active rental section - show this first if user has an active rental */}
                    {activeRental && (
                        <div className="active-rental-card">
                            <h2>🚴‍♂️ CURRENTLY RENTING</h2>
                            <div className="active-rental-info">
                                <div className="active-rental-details">
                                    <h3>🚲 Bike: {activeRental.bikeId}</h3>
                                    <p>📍 Rented from: {activeRental.stationName || 'Unknown Station'}</p>
                                    <p>🏷️ Station ID: {activeRental.stationId}</p>
                                    <p>👤 Rider: {activeRental.username}</p>
                                    <p>🕐 Started: {new Date(activeRental.startTime).toLocaleTimeString()}</p>
                                </div>
                                <div className="active-rental-timer">
                                    <div style={{ 
                                        marginBottom: '20px', 
                                        fontSize: '1.8rem', 
                                        fontWeight: '900',
                                        textAlign: 'center',
                                        color: '#ffffff',
                                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                                        letterSpacing: '2px',
                                        textTransform: 'uppercase'
                                    }}>
                                        ⏰ ACTIVE RENTAL TIMER
                                    </div>
                                    <ElapsedTimer startTime={activeRental.startTime} />
                                    <CostEstimator 
                                        startTime={activeRental.startTime} 
                                        bikeType={activeRental.bikeType || 'standard'} 
                                    />
                                    <div style={{ 
                                        marginTop: '20px', 
                                        textAlign: 'center',
                                        position: 'relative',
                                        zIndex: 1000
                                    }}>
                                        <button 
                                            className="rent-now-btn" 
                                            onClick={showReturnOptions}
                                            style={{
                                                padding: '15px 30px',
                                                fontSize: '1.1rem',
                                                fontWeight: 'bold',
                                                backgroundColor: '#e74c3c',
                                                border: '3px solid white',
                                                borderRadius: '15px',
                                                color: 'white',
                                                cursor: 'pointer',
                                                boxShadow: '0 6px 20px rgba(231,76,60,0.4)',
                                                transition: 'all 0.3s ease',
                                                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                                                position: 'relative',
                                                zIndex: 1001
                                            }}
                                            onMouseOver={(e) => {
                                                e.target.style.transform = 'scale(1.05)';
                                                e.target.style.boxShadow = '0 8px 25px rgba(231,76,60,0.6)';
                                            }}
                                            onMouseOut={(e) => {
                                                e.target.style.transform = 'scale(1)';
                                                e.target.style.boxShadow = '0 6px 20px rgba(231,76,60,0.4)';
                                            }}
                                        >
                                            🏁 Return Bike
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Return Stations Section */}
                    {showReturnStations && (
                        <div style={{
                            background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                            color: 'white',
                            padding: '25px',
                            borderRadius: '20px',
                            margin: '20px 0',
                            boxShadow: '0 10px 40px rgba(231,76,60,0.4)',
                            border: '3px solid #ffffff'
                        }}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <h2 style={{ margin: '0 0 10px 0', fontSize: '1.8rem', fontWeight: 'bold' }}>
                                    🏁 RETURN BIKE: {activeRental?.bikeId}
                                </h2>
                                <p style={{ margin: '0', fontSize: '1.1rem', opacity: 0.9 }}>
                                    Choose a station to return your bike
                                </p>
                                <button 
                                    onClick={cancelReturn}
                                    style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '2px solid white',
                                        color: 'white',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        marginTop: '10px',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    ❌ Cancel Return
                                </button>
                            </div>
                            
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                gap: '15px',
                                maxHeight: '400px',
                                overflowY: 'auto'
                            }}>
                                {returnStations.map(station => (
                                    <div key={station.id} style={{
                                        background: 'rgba(255,255,255,0.95)',
                                        color: '#333',
                                        padding: '15px',
                                        borderRadius: '15px',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                                    }}>
                                        <h3 style={{ margin: '0 0 10px 0', color: '#e74c3c', fontSize: '1.2rem' }}>
                                            📍 {station.name}
                                        </h3>
                                        <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#666' }}>
                                            {station.address}
                                        </p>
                                        <p style={{ margin: '10px 0', fontSize: '0.95rem', fontWeight: 'bold' }}>
                                            🚲 {station.freeDocks} free docks available
                                        </p>
                                        
                                        <div style={{ 
                                            display: 'flex', 
                                            flexWrap: 'wrap', 
                                            gap: '8px', 
                                            marginTop: '15px' 
                                        }}>
                                            {station.freeDockIds.slice(0, 6).map(dockId => (
                                                <button
                                                    key={dockId}
                                                    onClick={() => returnBikeToStation(station.id, dockId, station.name)}
                                                    style={{
                                                        background: '#00b894',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '8px 12px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.9rem',
                                                        fontWeight: 'bold',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.target.style.background = '#00a085';
                                                        e.target.style.transform = 'scale(1.05)';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.target.style.background = '#00b894';
                                                        e.target.style.transform = 'scale(1)';
                                                    }}
                                                >
                                                    🔒 Dock {dockId}
                                                </button>
                                            ))}
                                            {station.freeDockIds.length > 6 && (
                                                <button
                                                    style={{
                                                        background: '#636e72',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '8px 12px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem'
                                                    }}
                                                    onClick={() => alert(`All available docks at ${station.name}:\n\n${station.freeDockIds.join(', ')}`)}
                                                >
                                                    +{station.freeDockIds.length - 6} more
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {returnStations.length === 0 && !loading && (
                                <div style={{ 
                                    textAlign: 'center', 
                                    padding: '20px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '10px'
                                }}>
                                    <p style={{ margin: 0, fontSize: '1.1rem' }}>
                                        ⚠️ No stations with available docks found nearby.
                                    </p>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
                                        Please try again in a few minutes or contact support.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {reservations.length === 0 ? (
                        <div className="no-reservations">
                            <h3>No Active Reservations</h3>
                            <p>You don't have any bikes reserved right now.</p>
                            <p>Go to <strong>Available Bikes</strong> to reserve a bike!</p>
                        </div>
                    ) : (
                        <div className="reservations-section">
                            <h2>🚲 Reserved Bikes ({reservations.length})</h2>
                            <div className="reservations-grid">
                                {reservations.map((reservation) => {
                                    const timeRemaining = getTimeRemaining(reservation.expiresAt);
                                    return (
                                        <div key={reservation.bikeId} className="reservation-card">
                                            <div className="reservation-header">
                                                <h3>{reservation.bikeId}</h3>
                                                <span className={`bike-type-badge ${reservation.bikeType}`}>
                                                    {reservation.bikeType}
                                                </span>
                                            </div>
                                            
                                            <div className="reservation-details">
                                                <div className="station-info">
                                                    <h4>📍 {reservation.stationName}</h4>
                                                    <p className="address">{reservation.stationAddress}</p>
                                                </div>
                                                
                                                <div className="timing-info">
                                                    <div className="reserved-at">
                                                        <strong>Reserved at:</strong> {new Date(reservation.reservedAt).toLocaleTimeString()}
                                                    </div>
                                                    <div className="expires-at">
                                                        <strong>Expires at:</strong> {new Date(reservation.expiresAt).toLocaleTimeString()}
                                                    </div>
                                                    <div 
                                                        className="countdown-timer"
                                                        style={{ color: timeRemaining.color }}
                                                    >
                                                        <strong>
                                                            {timeRemaining.expired ? '⚠️ EXPIRED' : `⏱️ ${timeRemaining.text}`}
                                                        </strong>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="reservation-actions">
                                                {!timeRemaining.expired ? (
                                                    <>
                                                        <button 
                                                            className="cancel-reservation-btn"
                                                            onClick={() => cancelReservation(reservation.stationId, reservation.bikeId)}
                                                        >
                                                            Cancel Reservation
                                                        </button>
                                                        
                                                        <button 
                                                            className="rent-now-btn"
                                                            onClick={() => rentReservedBike(reservation.stationId, reservation.bikeId)}
                                                        >
                                                            Rent Now
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="expired-message" style={{
                                                        color: '#ff4444',
                                                        fontWeight: 'bold',
                                                        textAlign: 'center',
                                                        padding: '10px',
                                                        backgroundColor: '#ffe6e6',
                                                        border: '1px solid #ff4444',
                                                        borderRadius: '4px',
                                                        fontSize: '14px'
                                                    }}>
                                                        Reservation Expired - Bike is now available for others
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MyRentals;