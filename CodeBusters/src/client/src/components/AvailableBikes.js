import React, { useState, useEffect } from 'react';
import API_URL from '../config';
import './style/AvailableBikes.css';

const AvailableBikes = () => {
    const [stations, setStations] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [allStationsLoaded, setAllStationsLoaded] = useState(false);
    const [reservingBike, setReservingBike] = useState('');
    const [rentingBike, setRentingBike] = useState('');
    const [reservations, setReservations] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [hasActiveReservation, setHasActiveReservation] = useState(false);
    const [activeRentalLocal, setActiveRentalLocal] = useState(null);

    // Load all stations on component mount
    useEffect(() => {
        const loadAllStations = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_URL}/api/stations/map');
                const data = await response.json();
                
                if (data.success) {
                    setStations(data.stations);
                    setAllStationsLoaded(true);
                } else {
                    setError('Failed to load stations');
                }
            } catch (err) {
                setError('Network error loading stations');
                console.error('Error loading stations:', err);
            } finally {
                setLoading(false);
            }
        };

        loadAllStations();
    }, []);

    // Timer for countdown updates
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Check for active reservations
    useEffect(() => {
        const checkActiveReservations = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user) return;

                const response = await fetch(`${API_URL}/api/stations/map');
                const data = await response.json();
                
                if (data.success) {
                    let hasActive = false;
                    const currentUserId = user.id;
                    
                    data.stations.forEach(station => {
                        if (station.bikes) {
                            station.bikes.forEach(bike => {
                                if (bike.status === 'reserved' && bike.reservedBy === currentUserId) {
                                    // Check if reservation is still valid
                                    const expiryTime = new Date(bike.reservationExpiry);
                                    const now = new Date();
                                    
                                    if (expiryTime > now) {
                                        hasActive = true;
                                    }
                                }
                            });
                        }
                    });
                    
                    setHasActiveReservation(hasActive);
                }
            } catch (err) {
                console.error('Error checking active reservations:', err);
            }
        };

        checkActiveReservations();
        
        // Check every 30 seconds for updates
        const interval = setInterval(checkActiveReservations, 30000);
        
        return () => clearInterval(interval);
    }, [stations]); // Re-check when stations data changes

    // Load active rental from localStorage (so we can disable Rent buttons when user already rents a bike)
    useEffect(() => {
        const loadActiveRental = () => {
            try {
                const ar = JSON.parse(localStorage.getItem('activeRental'));
                setActiveRentalLocal(ar);
            } catch (e) {
                setActiveRentalLocal(null);
            }
        };

        // Initial load
        loadActiveRental();

        // Update when storage changes (other tabs) or when we dispatch a custom event (same tab)
        const handler = () => loadActiveRental();
        window.addEventListener('storage', handler);
        window.addEventListener('activeRentalChanged', handler);

        return () => {
            window.removeEventListener('storage', handler);
            window.removeEventListener('activeRentalChanged', handler);
        };
    }, []);

    // Search stations when query changes
    const handleSearch = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/stations/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success) {
                setSearchResults(data.stations);
                setError('');
            } else {
                setError(data.message || 'Search failed');
            }
        } catch (err) {
            setError('Network error during search');
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        
        // Debounce search
        const timeoutId = setTimeout(() => {
            handleSearch(query);
        }, 300);

        return () => clearTimeout(timeoutId);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'empty': return '#ff6b6b';
            case 'occupied': return '#51cf66';
            case 'full': return '#ffd43b';
            case 'out_of_service': return '#868e96';
            case 'on_trip': return '#ff6b6b';
            case 'in_use': return '#ff6b6b';
            default: return '#51cf66';
        }
    };

    // Reserve a bike
    const reserveBike = async (stationId, bikeId, stationName) => {
        setReservingBike(bikeId);
        try {
            // Get user info from localStorage (set during login)
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                alert('Please log in to reserve a bike');
                return;
            }

            const response = await fetch(`${API_URL}/api/reserve', {
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
                // Add to local reservations for tracking
                setReservations(prev => [...prev, data.reservation]);
                
                // Update active reservation status
                setHasActiveReservation(true);
                
                // Refresh station data
                if (searchQuery.trim()) {
                    handleSearch(searchQuery);
                } else {
                    const stationsResponse = await fetch(`${API_URL}/api/stations/map');
                    const stationsData = await stationsResponse.json();
                    if (stationsData.success) {
                        setStations(stationsData.stations);
                    }
                }
                
                // Dispatch event to notify activity history to refresh
                window.dispatchEvent(new CustomEvent('reservationMade', {
                    detail: { bikeId, stationId, stationName }
                }));
                
                alert(`Bike ${bikeId} reserved at ${stationName}!\nReservation expires at: ${new Date(data.reservation.expiresAt).toLocaleTimeString()}`);
            } else {
                // Handle the one-reservation-per-user limit error specifically
                if (data.existingReservation) {
                    const existingExpiry = new Date(data.existingReservation.expiresAt).toLocaleTimeString();
                    alert(`${data.message}\n\nYour existing reservation:\nBike: ${data.existingReservation.bikeId}\nStation: ${data.existingReservation.stationName}\nExpires: ${existingExpiry}\n\nCancel your existing reservation first or wait for it to expire.`);
                } else {
                    alert(`Failed to reserve bike: ${data.message}`);
                }
            }
        } catch (err) {
            console.error('Reservation error:', err);
            alert('Network error during reservation');
        } finally {
            setReservingBike('');
        }
    };

    // Rent a bike (undock) - uses /api/rent
    const rentBike = async (stationId, bikeId, stationName) => {
        setRentingBike(bikeId);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                alert('Please log in to rent a bike');
                return;
            }

            // Prevent renting more than one bike at a time client-side
            const existingActiveRental = JSON.parse(localStorage.getItem('activeRental'));
            if (existingActiveRental && String(existingActiveRental.userId) === String(user.id)) {
                alert('You already have an active rental. Return it before renting another bike.');
                return;
            }

            // Pre-flight: fetch latest station info to avoid posting stale rent requests
            try {
                const latest = await fetch(`${API_URL}/api/stations/map');
                const latestData = await latest.json();
                if (latestData && latestData.success) {
                    const stationNow = latestData.stations.find(s => s.id === stationId);
                    if (!stationNow) {
                        alert(`Station ${stationId} not found (latest). Please refresh.`);
                        setStations(latestData.stations);
                        setRentingBike('');
                        return;
                    }

                    const bikeNow = (stationNow.bikes || []).find(b => b.id === bikeId);
                    if (!bikeNow || bikeNow.status !== 'available') {
                        const statusText = bikeNow ? bikeNow.status : 'not present';
                        alert(`Bike ${bikeId} is no longer available at ${stationNow.id} (status: ${statusText}). Refreshing list.`);
                        setStations(latestData.stations);
                        // If we had a search active, re-run it to refresh searchResults
                        if (searchQuery.trim()) await handleSearch(searchQuery);
                        setRentingBike('');
                        return;
                    }
                }
            } catch (e) {
                console.error('Pre-flight station check failed:', e);
                // proceed to attempt rent; server will respond appropriately
            }
            // --- Optimistic UX: create activeRental and show it immediately ---
            const optimisticStartTime = new Date().toISOString();
            const optimisticActiveRental = {
                userId: String(user.id),
                username: user.username,
                bikeId: bikeId,
                stationId: stationId,
                stationName: stationName,
                startTime: optimisticStartTime,
                status: 'active',
                optimistic: true
            };

            // Persist and notify other components so MyRentals shows the rental immediately
            localStorage.setItem('activeRental', JSON.stringify(optimisticActiveRental));
            setActiveRentalLocal(optimisticActiveRental); // Show return dock buttons immediately
            window.dispatchEvent(new Event('activeRentalChanged'));
            window.dispatchEvent(new StorageEvent('storage', { key: 'activeRental', newValue: JSON.stringify(optimisticActiveRental) }));

            // Optimistically update UI: mark the bike as on_trip/in use and decrement docked count
            const markBikeOnTrip = (list) => {
                if (!list || !Array.isArray(list)) return list;
                return list.map(s => {
                    if (s.id !== stationId) return s;
                    const updatedAvailable = (s.availableBikes && s.availableBikes.bikes)
                        ? s.availableBikes.bikes.filter(b => b.id !== bikeId)
                        : [];

                    const updateBikeInArray = (arr) => {
                        if (!arr) return arr;
                        return arr.map(b => b.id === bikeId ? { ...b, status: 'on_trip' } : b);
                    };

                    const reserved = updateBikeInArray(s.reservedBikes && s.reservedBikes.bikes);
                    const maintenance = updateBikeInArray(s.maintenanceBikes && s.maintenanceBikes.bikes);

                    const bikesAvailableObj = {
                        count: updatedAvailable.length,
                        bikes: updatedAvailable
                    };

                    const newNumberDocked = Math.max(0, (s.numberOfBikesDocked || 0) - 1);
                    const newFreeDocks = (s.capacity || 0) - newNumberDocked;

                    return {
                        ...s,
                        availableBikes: bikesAvailableObj,
                        reservedBikes: { count: reserved ? reserved.length : (s.reservedBikes ? s.reservedBikes.count : 0), bikes: reserved || (s.reservedBikes && s.reservedBikes.bikes) || [] },
                        maintenanceBikes: { count: maintenance ? maintenance.length : (s.maintenanceBikes ? s.maintenanceBikes.count : 0), bikes: maintenance || (s.maintenanceBikes && s.maintenanceBikes.bikes) || [] },
                        numberOfBikesDocked: newNumberDocked,
                        freeDocks: newFreeDocks
                    };
                });
            };

            setStations(prev => markBikeOnTrip(prev));
            setSearchResults(prev => markBikeOnTrip(prev));

            // Now perform the actual rent call
            const response = await fetch(`${API_URL}/api/rent', {
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
                // Server accepted rental: replace optimistic flag
                const activeRental = {
                    ...optimisticActiveRental,
                    optimistic: false
                };
                localStorage.setItem('activeRental', JSON.stringify(activeRental));

                alert(`Bike ${bikeId} rented from ${stationName}. Have a great ride!`);

                // Refresh authoritative station data in background
                (async () => {
                    try {
                        if (searchQuery.trim()) {
                            await handleSearch(searchQuery);
                        } else {
                            const stationsResponse = await fetch(`${API_URL}/api/stations/map');
                            const stationsData = await stationsResponse.json();
                            if (stationsData.success) {
                                setStations(stationsData.stations);
                            }
                        }
                    } catch (e) {
                        console.error('Background refresh error:', e);
                    }
                })();
            } else {
                // Server rejected the rent: rollback optimistic state
                try {
                    const stationsResponse = await fetch(`${API_URL}/api/stations/map');
                    const stationsData = await stationsResponse.json();
                    if (stationsData.success) {
                        setStations(stationsData.stations);
                        if (searchQuery.trim()) await handleSearch(searchQuery);
                    }
                } catch (e) {
                    console.error('Error refreshing stations after failed rent:', e);
                }

                // remove optimistic active rental and notify
                localStorage.removeItem('activeRental');
                window.dispatchEvent(new Event('activeRentalChanged'));
                window.dispatchEvent(new StorageEvent('storage', { key: 'activeRental', newValue: null }));

                alert(`Failed to rent bike: ${data.message}`);
            }
        } catch (err) {
            console.error('Rent error:', err);
            alert('Network error during rental');
        } finally {
            setRentingBike('');
        }
    };

    // Return bike to a specific dock
    const returnBike = async (stationId, dockId, stationName) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !activeRentalLocal) {
                alert('No active rental or not logged in');
                return;
            }

            const response = await fetch(`${API_URL}/api/return', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id,
                    'x-user-role': user.role,
                    'x-username': user.username
                },
                body: JSON.stringify({ 
                    stationId: stationId, 
                    bikeId: activeRentalLocal.bikeId, 
                    userId: String(user.id) 
                })
            });

            const data = await response.json();
            if (data.success) {
                // Calculate rental duration for summary
                const startTime = new Date(activeRentalLocal.startTime);
                const endTime = new Date();
                const durationMs = endTime.getTime() - startTime.getTime();
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

                alert(
                    `Bike ${activeRentalLocal.bikeId} successfully returned to ${stationName}!\n\n` +
                    `Rental Summary:\n` +
                    `Duration: ${hours}h ${minutes}m\n` +
                    `Returned to: ${stationName}\n` +
                    `Final cost will be calculated based on your rental duration.`
                );
                
                // Clear local active rental
                localStorage.removeItem('activeRental');
                setActiveRentalLocal(null); // Hide return dock buttons
                
                // Notify other components
                window.dispatchEvent(new Event('activeRentalChanged'));
                window.dispatchEvent(new StorageEvent('storage', { key: 'activeRental', newValue: null }));
                
                // Refresh stations data
                if (searchQuery.trim()) {
                    handleSearch(searchQuery);
                } else {
                    const stationsResponse = await fetch(`${API_URL}/api/stations/map');
                    const stationsData = await stationsResponse.json();
                    if (stationsData.success) {
                        setStations(stationsData.stations);
                    }
                }
            } else {
                alert(`Failed to return bike: ${data.message}`);
            }
        } catch (err) {
            console.error('Return error:', err);
            alert('Network error during bike return');
        }
    };

    // Cancel reservation
    const cancelReservation = async (stationId, bikeId) => {
        try {
            // Get user info from localStorage (set during login)
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                alert('Please log in to cancel reservation');
                return;
            }

            const response = await fetch(`${API_URL}/api/reserve/cancel', {
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
                
                // Update active reservation status
                setHasActiveReservation(false);
                
                // Refresh station data
                if (searchQuery.trim()) {
                    handleSearch(searchQuery);
                } else {
                    const stationsResponse = await fetch(`${API_URL}/api/stations/map');
                    const stationsData = await stationsResponse.json();
                    if (stationsData.success) {
                        setStations(stationsData.stations);
                    }
                }
                
                // Dispatch event to notify activity history to refresh
                window.dispatchEvent(new CustomEvent('reservationCancelled', {
                    detail: { bikeId }
                }));
                
                alert(`Reservation cancelled for bike ${bikeId}`);
            } else {
                alert(`Failed to cancel reservation: ${data.message}`);
            }
        } catch (err) {
            console.error('Cancel reservation error:', err);
            alert('Network error during cancellation');
        }
    };

    // Calculate time remaining for reservation
    const getTimeRemaining = (expiryTime) => {
        const now = currentTime.getTime();
        const expiry = new Date(expiryTime).getTime();
        const remaining = expiry - now;
        
        if (remaining <= 0) {
            return 'EXPIRED';
        }
        
        const minutes = Math.floor(remaining / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Check if a reservation is expired
    const isReservationExpired = (expiryTime) => {
        const now = currentTime.getTime();
        const expiry = new Date(expiryTime).getTime();
        return expiry <= now;
    };

    const BikeList = ({ bikes, title, emptyMessage, icon, station, showReserveButton = false }) => {
        if (bikes.length === 0) {
            return (
                <div className="bike-section">
                    <h4>{icon} {title} ({bikes.length})</h4>
                    <p className="empty-message">{emptyMessage}</p>
                </div>
            );
        }

        return (
            <div className="bike-section">
                <h4>{icon} {title} ({bikes.length})</h4>
                <div className="bikes-grid">
                    {bikes.map((bike) => (
                        <div key={bike.id} className={`bike-card ${bike.type}`}>
                            <div className="bike-id">{bike.id}</div>
                            <div className="bike-details">
                                <span className="bike-type">{bike.type}</span>
                                <span className={`bike-status status-${bike.status}`}>
                                    {bike.status === 'on_trip' || bike.status === 'in_use' ? 'In Use' : bike.status}
                                </span>
                            </div>
                            
                            {bike.reservationExpiry && (
                                <div className="reservation-info">
                                    <div>Reserved until: {new Date(bike.reservationExpiry).toLocaleTimeString()}</div>
                                    <div className="countdown">
                                        Time left: <strong>{getTimeRemaining(bike.reservationExpiry)}</strong>
                                    </div>
                                </div>
                            )}
                            
                            {showReserveButton && bike.status === 'available' && (
                                <div className="bike-actions">
                                    <button 
                                        className={`reserve-button ${hasActiveReservation ? 'disabled' : ''}`}
                                        onClick={() => reserveBike(station.id, bike.id, station.name)}
                                        disabled={reservingBike === bike.id || hasActiveReservation}
                                        title={hasActiveReservation ? 'You already have an active reservation. Cancel it first.' : ''}
                                    >
                                        {reservingBike === bike.id ? 'Reserving...' : 
                                         hasActiveReservation ? 'Already Reserved' : 'Reserve'}
                                    </button>

                                    <button
                                        className="rent-button"
                                        onClick={() => rentBike(station.id, bike.id, station.name)}
                                        disabled={rentingBike === bike.id || reservingBike === bike.id}
                                        title={rentingBike === bike.id ? 'Renting...' : 'Rent this bike now'}
                                    >
                                        {rentingBike === bike.id ? 'Renting...' : 'Rent'}
                                    </button>
                                </div>
                            )}
                            
                            {bike.status === 'reserved' && bike.reservationExpiry && (
                                !isReservationExpired(bike.reservationExpiry) ? (
                                    <button 
                                        className="cancel-button"
                                        onClick={() => cancelReservation(station.id, bike.id)}
                                    >
                                        Cancel Reservation
                                    </button>
                                ) : (
                                    <div className="expired-status">
                                        RESERVATION EXPIRED - Bike Available
                                    </div>
                                )
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const StationCard = ({ station }) => (
        <div className="station-card">
            <div className="station-header">
                <h3>{station.name}</h3>
                <div 
                    className="status-indicator" 
                    style={{ backgroundColor: getStatusColor(station.status) }}
                >
                    {station.status}
                </div>
            </div>
            
            <div className="station-info">
                <p className="address">{station.address}</p>
                <div className="capacity-info">
                    <span>Capacity: {station.capacity}</span>
                    <span>Docked Bikes: {station.numberOfBikesDocked}</span>
                    <span>Free Docks: {station.freeDocks}</span>
                    {station.totalBikes > station.numberOfBikesDocked && (
                        <span className="maintenance-note">
                            +{station.totalBikes - station.numberOfBikesDocked} in maintenance
                        </span>
                    )}
                </div>
                {activeRentalLocal && station.freeDockIds && station.freeDockIds.length > 0 && (
                    <div className="free-docks">
                        <strong>Return {activeRentalLocal.bikeId} here:</strong>
                        <div className="return-instruction">
                            Click any dock below to return your bike to {station.name}
                        </div>
                        <div className="dock-list">
                            {station.freeDockIds.slice(0, 8).map(d => (
                                <button 
                                    key={d} 
                                    className="dock-chip dock-chip-clickable"
                                    onClick={() => returnBike(station.id, d, station.name)}
                                    title={`Return bike ${activeRentalLocal.bikeId} to dock ${d} at ${station.name}`}
                                >
                                    {d}
                                </button>
                            ))}
                            {station.freeDockIds.length > 8 && (
                                <button 
                                    className="dock-more dock-chip-clickable"
                                    onClick={() => {
                                        const allDocks = station.freeDockIds.map(d => d).join('\n');
                                        alert(`All ${station.freeDockIds.length} available docks at ${station.name}:\n\n${allDocks}\n\nScroll to find more dock buttons to return your bike.`);
                                    }}
                                    title={`Show all ${station.freeDockIds.length} available docks`}
                                >
                                    +{station.freeDockIds.length - 8} more docks
                                </button>
                            )}
                        </div>
                    </div>
                )}
                <div className="summary">{station.summary}</div>
            </div>

            <BikeList 
                bikes={station.availableBikes.bikes} 
                title="Available Bikes" 
                emptyMessage="No bikes available for rent"
                icon="🚲"
                station={station}
                showReserveButton={true}
            />

            {station.reservedBikes.count > 0 && (
                <BikeList 
                    bikes={station.reservedBikes.bikes} 
                    title="Reserved Bikes" 
                    emptyMessage="No bikes currently reserved"
                    station={station}
                    showReserveButton={false}
                />
            )}

            {station.maintenanceBikes.count > 0 && (
                <BikeList 
                    bikes={station.maintenanceBikes.bikes} 
                    title="Maintenance Bikes" 
                    emptyMessage="No bikes in maintenance"
                    station={station}
                    showReserveButton={false}
                />
            )}
        </div>
    );

    const displayStations = searchQuery.trim() ? searchResults : 
                            allStationsLoaded ? stations.filter(s => s.totalBikes > 0) : [];

    return (
        <div className="available-bikes-container">
            <div className="header">
                <h1>Available Bikes</h1>
                <p>Find and rent bikes from stations across Montreal</p>
            </div>

            <div className="search-section">
                <input
                    type="text"
                    placeholder="Search stations by name or location (e.g., 'Plateau-Mont-Royal', 'Concordia')..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="search-input"
                />
                {loading && <div className="loading">Searching...</div>}
                {error && <div className="error">{error}</div>}
            </div>

            <div className="results-section">
                {searchQuery.trim() ? (
                    <>
                        <h2>Search Results for "{searchQuery}"</h2>
                        {searchResults.length === 0 && !loading ? (
                            <div className="no-results">
                                No stations found matching your search. Try searching for:
                                <ul>
                                    <li>Concordia University</li>
                                    <li>Plateau-Mont-Royal</li>
                                    <li>Old Port</li>
                                    <li>McGill University</li>
                                </ul>
                            </div>
                        ) : (
                            <div className="stations-grid">
                                {searchResults.map(station => (
                                    <StationCard key={station.id} station={station} />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <h2>Stations with Available Bikes</h2>
                        {displayStations.length === 0 && !loading ? (
                            <div className="no-results">
                                No stations with available bikes right now. Use the search above to find specific stations.
                            </div>
                        ) : (
                            <div className="stations-grid">
                                {displayStations.map(station => (
                                    <StationCard key={station.id} station={station} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AvailableBikes;