import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import TierNotification from './TierNotification';
import './style/MyRentals.css';

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
            <div className="elapsed-timer">
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
            <div className="cost-estimator">
                Estimated Cost: <span className="cost-estimator-value">${estimatedCost.toFixed(2)}</span>
                <div className="cost-estimator-details">
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
    const [tierNotification, setTierNotification] = useState(null);
    const { updateUserLoyaltyTier } = useAuth();

    // Timer for countdown updates
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

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
            
            console.log('[Return Bike] Response data:', data);
            console.log('[Return Bike] Tier notification:', data.tierNotification);
            
            if (data.success) {
                // Calculate rental duration for summary
                const startTime = new Date(activeRental.startTime);
                const endTime = new Date();
                const durationMs = endTime.getTime() - startTime.getTime();
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

                // Check if tier changed and show notification
                if (data.tierNotification) {
                    console.log('[Return Bike] Setting tier notification:', data.tierNotification);
                    setTierNotification(data.tierNotification);
                    updateUserLoyaltyTier(data.tierNotification.newTier);
                    // Notify Profile component of tier update
                    window.dispatchEvent(new CustomEvent('tierUpdated', {
                        detail: { 
                            oldTier: data.tierNotification.oldTier,
                            newTier: data.tierNotification.newTier
                        }
                    }));
                }

                // Delay alert slightly to allow notification to render first
                setTimeout(() => {
                    alert(
                        `Bike ${activeRental.bikeId} successfully returned to ${stationName}!\n\n` +
                        `Rental Summary:\n` +
                        `Duration: ${hours}h ${minutes}m\n` +
                        `Returned to: ${stationName} (Dock ${dockId})\n` +
                        `Final cost will be calculated based on your rental duration.`
                    );
                }, 100);
                
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
                alert(`Failed to return bike: ${data.message}\n\nPlease try again or contact support.`);
                console.error('Return failed:', data);
            }
        } catch (err) {
            console.error('Return error:', err);
            alert('Network error during return. Please check your connection and try again.');
        }
    };

    // Cancel return mode
    const cancelReturn = () => {
        setShowReturnStations(false);
        setReturnStations([]);
    };

    // Report bike damage
    const reportDamage = async () => {
        if (!activeRental) {
            alert('No active rental to report damage for');
            return;
        }

        const description = prompt(
            'Please describe the damage to the bike:\n\n' +
            `Bike: ${activeRental.bikeId}\n` +
            `Station: ${activeRental.stationName || activeRental.stationId}\n\n` +
            'Note: Your rental will be ended immediately upon reporting damage.\n' +
            'Your report will be sent to operators immediately.'
        );

        if (!description || description.trim() === '') {
            return; // User cancelled or entered nothing
        }

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                alert('Please log in to report damage');
                return;
            }

            const response = await fetch(`http://localhost:5001/api/bikes/${activeRental.bikeId}/report-damage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'x-user-id': String(user.id),
                    'x-username': user.username,
                    'x-user-role': user.role || 'rider'
                },
                body: JSON.stringify({
                    description: description.trim()
                })
            });

            const data = await response.json();

            if (data.success) {
                // Clear active rental from localStorage
                localStorage.removeItem('activeRental');
                
                // Notify other components
                window.dispatchEvent(new Event('activeRentalChanged'));
                window.dispatchEvent(new StorageEvent('storage', { key: 'activeRental', newValue: null }));
                
                // Clear local state
                setActiveRental(null);
                
                // Show success message with rental details
                const hours = Math.floor(data.duration / 60);
                const minutes = data.duration % 60;
                
                alert(
                    `✓ Damage Report Submitted Successfully\n\n` +
                    `Report ID: #${data.reportId}\n` +
                    `Bike: ${data.bikeId}\n` +
                    `Location: ${data.stationName}\n` +
                    `Status: NOT AVAILABLE (Maintenance Required)\n\n` +
                    `RENTAL ENDED\n` +
                    `Duration: ${hours}h ${minutes}m\n` +
                    `Cost: $${data.totalCost.toFixed(2)}\n\n` +
                    `The bike will remain at ${data.stationName} for inspection.\n` +
                    `All operators have been notified.\n\n` +
                    `Thank you for helping keep our fleet safe!`
                );
                
                // Dispatch event to notify ride history to refresh
                window.dispatchEvent(new CustomEvent('rentalEnded', {
                    detail: { 
                        bikeId: data.bikeId,
                        stationId: data.stationId,
                        stationName: data.stationName,
                        duration: { hours, minutes }
                    }
                }));
            } else {
                alert(`Failed to submit damage report:\n\n${data.message}`);
            }
        } catch (err) {
            console.error('Error reporting damage:', err);
            alert('Network error while submitting damage report.\nPlease try again or contact support.');
        }
    };

    return (
        <div className="my-rentals-container">
            <TierNotification 
                notification={tierNotification}
                onClose={() => setTierNotification(null)}
            />
            
            <div className="header">
                <h1>My Rentals & Reservations</h1>
                <p>Manage your active bike reservations and rentals</p>
            </div>

            {loading && <div className="loading">Loading your reservations...</div>}
            {error && <div className="error">{error}</div>}

            {!loading && !error && (
                <>
                    {/* Active rental section - show this first if user has an active rental */}
                    {activeRental && (
                        <div className="active-rental-card">
                            <h2>CURRENTLY RENTING</h2>
                            <div className="active-rental-info">
                                <div className="active-rental-details">
                                    <h3>Bike: {activeRental.bikeId}</h3>
                                    <p>Rented from: {activeRental.stationName || 'Unknown Station'}</p>
                                    <p>Station ID: {activeRental.stationId}</p>
                                    <p>Rider: {activeRental.username}</p>
                                    <p>Started: {new Date(activeRental.startTime).toLocaleTimeString()}</p>
                                </div>
                                <div className="active-rental-timer">
                                    <div className="active-rental-timer-title">
                                        ACTIVE RENTAL TIMER
                                    </div>
                                    <ElapsedTimer startTime={activeRental.startTime} />
                                    <CostEstimator 
                                        startTime={activeRental.startTime} 
                                        bikeType={activeRental.bikeType || 'standard'} 
                                    />
                                    <div className="return-button-container">
                                        <button 
                                            className="return-bike-button" 
                                            onClick={showReturnOptions}
                                        >
                                            Return Bike
                                        </button>
                                        <button 
                                            className="report-damage-button" 
                                            onClick={reportDamage}
                                        >
                                            ⚠️ Report Damage
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Return Stations Section */}
                    {showReturnStations && (
                        <div className="return-stations-container">
                            <div className="return-stations-header">
                                <h2 className="return-stations-title">
                                    RETURN BIKE: {activeRental?.bikeId}
                                </h2>
                                <p className="return-stations-subtitle">
                                    Choose a station to return your bike
                                </p>
                                <button 
                                    onClick={cancelReturn}
                                    className="cancel-return-button"
                                >
                                    Cancel Return
                                </button>
                            </div>
                            
                            <div className="return-stations-grid">
                                {returnStations.map(station => (
                                    <div key={station.id} className="return-station-card">
                                        <h3 className="return-station-name">
                                            {station.name}
                                        </h3>
                                        <p className="return-station-address">
                                            {station.address}
                                        </p>
                                        <p className="return-station-docks">
                                            {station.freeDocks} free docks available
                                        </p>
                                        
                                        <div className="dock-buttons-container">
                                            {station.freeDockIds.slice(0, 6).map(dockId => (
                                                <button
                                                    key={dockId}
                                                    onClick={() => returnBikeToStation(station.id, dockId, station.name)}
                                                    className="dock-button"
                                                >
                                                    Dock {dockId}
                                                </button>
                                            ))}
                                            {station.freeDockIds.length > 6 && (
                                                <button
                                                    className="dock-button-more"
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
                                <div className="no-return-stations">
                                    <p className="no-return-stations-title">
                                        No stations with available docks found nearby.
                                    </p>
                                    <p className="no-return-stations-message">
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
                                                    <h4>{reservation.stationName}</h4>
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
                                                            {timeRemaining.expired ? 'EXPIRED' : `${timeRemaining.text}`}
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
                                                    <div className="expired-message">
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