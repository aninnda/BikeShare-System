import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import API_URL from '../config';
import 'leaflet/dist/leaflet.css';
import './style/MapComponent.css';

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
            html: `<div style="background-color: ${color} !important;">🚉</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
        });
    } else {
        return L.divIcon({
            className: 'custom-bike-marker',
            html: `<div style="background-color: ${color} !important;">🚲</div>`,
            iconSize: [25, 25],
            iconAnchor: [12, 12],
        });
    }
};

// Station status colors for R-BMS-01 requirements
const getStationColor = (station) => {
    // R-BMS-01: Status (empty | occupied | full | out_of_service)
    console.log('Station:', station.id, 'Status:', station.status, 'Bikes:', station.numberOfBikesDocked, 'Capacity:', station.capacity);
    
    switch (station.status) {
        case 'out_of_service': return '#ff4444'; // Red
        case 'empty': return '#ffaa00'; // Orange
        case 'full': return '#4444ff'; // Blue
        case 'occupied': return '#44aa44'; // Green
        default: 
            console.warn('Unknown station status:', station.status);
            return '#888888'; // Gray for unknown status
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
                <div className="popup-container">
                    <h3 className="popup-title">
                        {station.name}
                    </h3>
                    
                    <div className="popup-field">
                        <strong>Status:</strong> 
                        <span className="popup-status" style={{ color: color }}>
                            {station.status}
                        </span>
                    </div>
                    
                    <div className="popup-field">
                        <strong>Address:</strong><br />
                        {station.address}
                    </div>
                    
                    <div className="popup-field">
                        <strong>Capacity:</strong> {station.capacity} docks
                    </div>
                    
                    <div className="popup-field">
                        <strong>Bikes Available:</strong> {station.availableBikesCount || station.bikesAvailable || 0}
                    </div>
                    
                    <div className="popup-field">
                        <strong>Bikes Docked:</strong> {station.numberOfBikesDocked || 0} (includes {station.reservedBikesCount || 0} reserved)
                    </div>
                    
                    <div className="popup-field">
                        <strong>Free Docks:</strong> {station.freeDocks || 0}
                    </div>
                    
                    <div className="popup-field">
                        <strong>Coordinates:</strong> {station.latitude}, {station.longitude}
                    </div>
                    
                    {station.bikes && station.bikes.length > 0 && (
                        <div className="popup-field">
                            <strong>Docked Bikes:</strong>
                            <ul className="popup-bikes-list">
                                {station.bikes.map(bike => (
                                    <li key={bike.id}>
                                        {bike.id} ({bike.type}) - 
                                        <span style={{ color: getBikeColor(bike) }}>
                                            {bike.status}
                                        </span>
                                        {bike.reservationExpiry && (
                                            <div className="popup-reservation-expiry">
                                                Reserved until: {new Date(bike.reservationExpiry).toLocaleTimeString()}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    <div className="popup-field">
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
                <div className="popup-container-bike">
                    <h3 className="popup-title">
                        Bike {bike.id}
                    </h3>
                    
                    <div className="popup-field">
                        <strong>Type:</strong> {bike.type}
                    </div>
                    
                    <div className="popup-field">
                        <strong>Status:</strong> 
                        <span className="popup-status" style={{ color: color }}>
                            {bike.status}
                        </span>
                    </div>
                    
                    {bike.station && (
                        <div className="popup-field">
                            <strong>Station:</strong><br />
                            {bike.station.stationName}
                        </div>
                    )}
                    
                    {bike.reservationExpiry && (
                        <div className="popup-field">
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
            const stationsResponse = await fetch(`${API_URL}/api/stations/map');
            if (!stationsResponse.ok) {
                throw new Error('Failed to fetch stations');
            }
            const stationsData = await stationsResponse.json();
            setStations(stationsData.stations || []);

            // Fetch bikes
            const bikesResponse = await fetch(`${API_URL}/api/bikes/map');
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
            <div className="map-loading">
                <div>Loading map data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="map-error">
                <div>Error loading map: {error}</div>
            </div>
        );
    }

    return (
        <div>
            <h2 className="map-header">
                Find your docking station!
            </h2>
            <div className="map-wrapper">
                {/* Map Controls */}
            <div className="map-controls">
                <div className="map-controls-button-group">
                    <button 
                        onClick={fetchMapData}
                        className="map-refresh-button"
                    >
                        Refresh
                    </button>
                </div>
                
                <label className="map-checkbox-label">
                    <input 
                        type="checkbox"
                        checked={showBikes}
                        onChange={(e) => setShowBikes(e.target.checked)}
                    />
                    Show Individual Bikes
                </label>
                
                <div className="map-legend">
                    <div><strong>Station Status:</strong></div>
                    <div><span style={{ color: '#44aa44' }}>●</span> Occupied</div>
                    <div><span style={{ color: '#ffaa00' }}>●</span> Empty</div>
                    <div><span style={{ color: '#4444ff' }}>●</span> Full</div>
                    <div><span style={{ color: '#ff4444' }}>●</span> Out of Service</div>
                    <div className="map-legend-section"><strong>Bike Status:</strong></div>
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
                className="leaflet-container"
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
            <div className="map-stats">
                <div className="map-stat-item">
                    <div className="map-stat-value">
                        {stations.length}
                    </div>
                    <div className="map-stat-label">Stations</div>
                </div>
                <div className="map-stat-item">
                    <div className="map-stat-value">
                        {bikes.length}
                    </div>
                    <div className="map-stat-label">Bikes</div>
                </div>
                <div className="map-stat-item">
                    <div className="map-stat-value available">
                        {stations.filter(s => s.status === 'active' && s.bikesAvailable > 0).length}
                    </div>
                    <div className="map-stat-label">Available</div>
                </div>
                <div className="map-stat-item">
                    <div className="map-stat-value out-of-service">
                        {stations.filter(s => s.status === 'out_of_service').length}
                    </div>
                    <div className="map-stat-label">Out of Service</div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default MapComponent;