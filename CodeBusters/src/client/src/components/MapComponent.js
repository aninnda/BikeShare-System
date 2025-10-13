import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Cache cleared - no dark mode

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons for different station states
const createCustomIcon = (color, isStation = true) => {
    if (isStation) {
        return L.divIcon({
            className: 'custom-station-marker',
            html: `<div style="
                background-color: ${color};
                border: 2px solid white;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                color: white;
                font-weight: bold;
                font-size: 12px;
            ">🚉</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
        });
    } else {
        return L.divIcon({
            className: 'custom-bike-marker',
            html: `<div style="
                background-color: ${color};
                border: 2px solid white;
                border-radius: 50%;
                width: 25px;
                height: 25px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                color: white;
                font-weight: bold;
                font-size: 10px;
            ">🚲</div>`,
            iconSize: [25, 25],
            iconAnchor: [12, 12],
        });
    }
};

// Station status colors for R-BMS-01 requirements
const getStationColor = (station) => {
    // R-BMS-01: Status (empty | occupied | full | out_of_service)
    switch (station.status) {
        case 'out_of_service': return '#ff4444'; // Red
        case 'empty': return '#ffaa00'; // Orange
        case 'full': return '#4444ff'; // Blue
        case 'occupied': return '#44aa44'; // Green
        default: return '#888888'; // Gray for unknown status
    }
};

// Bike status colors
const getBikeColor = (bike) => {
    switch (bike.status) {
        case 'available': return '#44aa44'; // Green
        case 'reserved': return '#ffaa00'; // Orange
        case 'on_trip': return '#4444ff'; // Blue
        case 'maintenance': return '#ff4444'; // Red
        default: return '#888888'; // Gray
    }
};

const StationMarker = ({ station }) => {
    const color = getStationColor(station);
    const icon = createCustomIcon(color, true);

    return (
        <Marker position={[station.latitude, station.longitude]} icon={icon}>
            <Popup>
                <div style={{ minWidth: '250px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#922338' }}>
                        {station.name}
                    </h3>
                    
                    <div style={{ marginBottom: '8px' }}>
                        <strong>Status:</strong> 
                        <span style={{ 
                            color: color, 
                            marginLeft: '5px',
                            fontWeight: 'bold'
                        }}>
                            {station.status}
                        </span>
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                        <strong>Address:</strong><br />
                        {station.address}
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                        <strong>Capacity:</strong> {station.capacity} docks
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                        <strong>Bikes Available:</strong> {station.availableBikesCount || station.bikesAvailable || 0}
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                        <strong>Bikes Docked:</strong> {station.numberOfBikesDocked || 0} (includes {station.reservedBikesCount || 0} reserved)
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                        <strong>Free Docks:</strong> {station.freeDocks || 0}
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                        <strong>Coordinates:</strong> {station.latitude}, {station.longitude}
                    </div>
                    
                    {station.bikes && station.bikes.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                            <strong>Docked Bikes:</strong>
                            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                                {station.bikes.map(bike => (
                                    <li key={bike.id} style={{ fontSize: '12px' }}>
                                        {bike.id} ({bike.type}) - 
                                        <span style={{ color: getBikeColor(bike) }}>
                                            {bike.status}
                                        </span>
                                        {bike.reservationExpiry && (
                                            <div style={{ fontSize: '10px', color: '#666' }}>
                                                Reserved until: {new Date(bike.reservationExpiry).toLocaleTimeString()}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    <div style={{ marginBottom: '8px' }}>
                        <strong>Reservation Hold Time:</strong> {station.reservationHoldTimeMinutes || 15} minutes
                    </div>
                </div>
            </Popup>
        </Marker>
    );
};

const BikeMarker = ({ bike }) => {
    if (!bike.station || !bike.station.latitude || !bike.station.longitude) {
        return null; // Don't render bikes without location data
    }

    const color = getBikeColor(bike);
    const icon = createCustomIcon(color, false);

    return (
        <Marker position={[bike.station.latitude, bike.station.longitude]} icon={icon}>
            <Popup>
                <div style={{ minWidth: '200px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#922338' }}>
                        Bike {bike.id}
                    </h3>
                    
                    <div style={{ marginBottom: '8px' }}>
                        <strong>Type:</strong> {bike.type}
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                        <strong>Status:</strong> 
                        <span style={{ 
                            color: color, 
                            marginLeft: '5px',
                            fontWeight: 'bold'
                        }}>
                            {bike.status}
                        </span>
                    </div>
                    
                    {bike.station && (
                        <div style={{ marginBottom: '8px' }}>
                            <strong>Station:</strong><br />
                            {bike.station.stationName}
                        </div>
                    )}
                    
                    {bike.reservationExpiry && (
                        <div style={{ marginBottom: '8px' }}>
                            <strong>Reserved Until:</strong><br />
                            {new Date(bike.reservationExpiry).toLocaleString()}
                        </div>
                    )}
                </div>
            </Popup>
        </Marker>
    );
};

const MapComponent = () => {
    const [stations, setStations] = useState([]);
    const [bikes, setBikes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showBikes, setShowBikes] = useState(false);
    const [mapCenter] = useState([45.5017, -73.5673]); // Montreal center

    useEffect(() => {
        fetchMapData();
    }, []);

    const fetchMapData = async () => {
        try {
            setLoading(true);
            
            // Fetch stations
            const stationsResponse = await fetch('http://localhost:5001/api/stations/map');
            if (!stationsResponse.ok) {
                throw new Error('Failed to fetch stations');
            }
            const stationsData = await stationsResponse.json();
            setStations(stationsData.stations || []);

            // Fetch bikes
            const bikesResponse = await fetch('http://localhost:5001/api/bikes/map');
            if (!bikesResponse.ok) {
                throw new Error('Failed to fetch bikes');
            }
            const bikesData = await bikesResponse.json();
            setBikes(bikesData.bikes || []);
            
        } catch (err) {
            console.error('Error fetching map data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '400px',
                backgroundColor: '#f5f5f5'
            }}>
                <div>Loading map data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '400px',
                backgroundColor: '#ffe6e6',
                color: '#cc0000'
            }}>
                <div>Error loading map: {error}</div>
            </div>
        );
    }

    return (
        <div>
            <h2 style={{ 
                margin: '0 0 20px 0', 
                color: '#922338', 
                textAlign: 'center',
                fontSize: '28px',
                fontWeight: 'bold'
            }}>
                Find your docking station!
            </h2>
            <div style={{ position: 'relative' }}>
                {/* Map Controls */}
            <div style={{ 
                position: 'absolute', 
                top: '10px', 
                right: '10px', 
                zIndex: 1000,
                backgroundColor: 'white',
                padding: '10px',
                borderRadius: '5px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
                <div style={{ marginBottom: '10px' }}>
                    <button 
                        onClick={fetchMapData}
                        style={{ 
                            backgroundColor: '#922338',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            marginRight: '5px'
                        }}
                    >
                        Refresh
                    </button>
                </div>
                
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                    <input 
                        type="checkbox"
                        checked={showBikes}
                        onChange={(e) => setShowBikes(e.target.checked)}
                        style={{ marginRight: '5px' }}
                    />
                    Show Individual Bikes
                </label>
                
                <div style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>
                    <div><strong>Station Status:</strong></div>
                    <div><span style={{ color: '#44aa44' }}>●</span> Occupied</div>
                    <div><span style={{ color: '#ffaa00' }}>●</span> Empty</div>
                    <div><span style={{ color: '#4444ff' }}>●</span> Full</div>
                    <div><span style={{ color: '#ff4444' }}>●</span> Out of Service</div>
                    <div style={{ marginTop: '5px' }}><strong>Bike Status:</strong></div>
                    <div><span style={{ color: '#44aa44' }}>●</span> Available</div>
                    <div><span style={{ color: '#ffaa00' }}>●</span> Reserved</div>
                    <div><span style={{ color: '#4444ff' }}>●</span> On Trip</div>
                    <div><span style={{ color: '#ff4444' }}>●</span> Maintenance</div>
                </div>
            </div>
            
            {/* Map */}
            <MapContainer 
                center={mapCenter} 
                zoom={12} 
                style={{ height: '650px', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Station Markers */}
                {stations.map(station => {
                    if (station.latitude && station.longitude) {
                        return <StationMarker key={station.id} station={station} />;
                    }
                    return null;
                })}
                
                {/* Bike Markers (if enabled) */}
                {showBikes && bikes.map(bike => {
                    if (bike.station && bike.station.latitude && bike.station.longitude) {
                        return <BikeMarker key={bike.id} bike={bike} />;
                    }
                    return null;
                })}
            </MapContainer>
            
            {/* Summary Stats */}
            <div style={{ 
                marginTop: '10px', 
                display: 'flex', 
                justifyContent: 'space-around',
                backgroundColor: '#f5f5f5',
                padding: '10px',
                borderRadius: '5px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#922338' }}>
                        {stations.length}
                    </div>
                    <div style={{ fontSize: '12px' }}>Stations</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#922338' }}>
                        {bikes.length}
                    </div>
                    <div style={{ fontSize: '12px' }}>Bikes</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#44aa44' }}>
                        {stations.filter(s => s.status === 'active' && s.bikesAvailable > 0).length}
                    </div>
                    <div style={{ fontSize: '12px' }}>Available</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#ff4444' }}>
                        {stations.filter(s => s.status === 'out_of_service').length}
                    </div>
                    <div style={{ fontSize: '12px' }}>Out of Service</div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default MapComponent;