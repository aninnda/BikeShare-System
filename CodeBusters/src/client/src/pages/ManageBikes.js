import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import API_URL from '../config';
import DamageReportNotifications from '../components/DamageReportNotifications';
import './style/ManageBikes.css';

const ManageBikes = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // State management
    const [activeTab, setActiveTab] = useState('stations'); // 'stations' | 'bikes'
    const [stations, setStations] = useState([]);
    const [bikes, setBikes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' | 'error'

    // Add new bike form state
    const [newBike, setNewBike] = useState({
        bikeId: '',
        type: 'standard',
        stationId: ''
    });

    // Move bike form state
    const [moveBike, setMoveBike] = useState({
        bikeId: '',
        fromStationId: '',
        toStationId: ''
    });

    // Check if user is operator (allow 'dual' as operator-equivalent)
    useEffect(() => {
        if (!user || (user.role !== 'operator' && user.role !== 'dual')) {
            navigate('/');
        }
    }, [user, navigate]);

    const showMessage = useCallback((msg, type = 'success') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => {
            setMessage('');
            setMessageType('');
        }, 5000);
    }, []);

    const fetchStations = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/stations/map');
            const data = await response.json();
            
            if (data.success) {
                setStations(data.stations || []);
            }
        } catch (error) {
            console.error('Error fetching stations:', error);
            showMessage('Error loading stations', 'error');
        } finally {
            setLoading(false);
        }
    }, [showMessage]);

    const fetchBikes = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/stations/map');
            const data = await response.json();
            
            if (data.success) {
                // Extract all bikes from stations
                const allBikes = [];
                data.stations.forEach(station => {
                    if (station.bikes && station.bikes.length > 0) {
                        station.bikes.forEach(bike => {
                            allBikes.push({
                                ...bike,
                                stationId: station.id,
                                stationName: station.name
                            });
                        });
                    }
                });
                setBikes(allBikes);
            }
        } catch (error) {
            console.error('Error fetching bikes:', error);
        }
    }, []);

    // Fetch stations and bikes on mount
    useEffect(() => {
        fetchStations();
        fetchBikes();
    }, [fetchStations, fetchBikes]);

    // Toggle station maintenance status
    const toggleStationStatus = async (stationId, currentStatus) => {
        try {
            const action = currentStatus === 'out_of_service' ? 'end' : 'start';
            
            console.log('Toggling station status:', { stationId, currentStatus, action });
            
            const response = await fetch(`${API_URL}/api/stations/${stationId}/maintenance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id.toString(),
                    'x-user-role': user.role,
                    'x-username': user.username || user.email || `user_${user.id}`
                },
                body: JSON.stringify({ action })
            });

            const data = await response.json();
            console.log('Server response:', data);

            if (data.success) {
                showMessage(`Station ${action === 'start' ? 'taken out of' : 'put back in'} service`, 'success');
                await fetchStations();
                console.log('Stations refreshed');
            } else {
                showMessage(data.message || 'Failed to update station status', 'error');
            }
        } catch (error) {
            console.error('Error updating station:', error);
            showMessage('Error updating station status', 'error');
        }
    };

    // Toggle bike maintenance status
    const toggleBikeStatus = async (bikeId, currentStatus, stationId) => {
        try {
            // Use database to update bike status
            const newStatus = currentStatus === 'maintenance' ? 'available' : 'maintenance';
            
            const response = await fetch(`${API_URL}/api/bikes/${bikeId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id.toString(),
                    'x-user-role': user.role,
                    'x-username': user.username || user.email || `user_${user.id}`
                },
                body: JSON.stringify({ 
                    status: newStatus,
                    stationId: stationId
                })
            });

            const data = await response.json();

            if (data.success || response.ok) {
                showMessage(`Bike ${newStatus === 'maintenance' ? 'taken out of' : 'put back in'} service`, 'success');
                fetchBikes();
                fetchStations();
            } else {
                showMessage(data.message || 'Failed to update bike status', 'error');
            }
        } catch (error) {
            console.error('Error updating bike:', error);
            showMessage('Error updating bike status', 'error');
        }
    };

    // Handle move bike
    const handleMoveBike = async (e) => {
        e.preventDefault();
        
        if (!moveBike.bikeId || !moveBike.fromStationId || !moveBike.toStationId) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        if (moveBike.fromStationId === moveBike.toStationId) {
            showMessage('Source and destination stations must be different', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/manual-move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id.toString(),
                    'x-user-role': user.role,
                    'x-username': user.username || user.email || `user_${user.id}`
                },
                body: JSON.stringify({
                    bikeId: moveBike.bikeId,
                    fromStationId: moveBike.fromStationId,
                    toStationId: moveBike.toStationId,
                    operatorId: user.id
                })
            });

            const data = await response.json();

            if (data.success) {
                showMessage(`Bike moved successfully from ${moveBike.fromStationId} to ${moveBike.toStationId}`, 'success');
                setMoveBike({ bikeId: '', fromStationId: '', toStationId: '' });
                fetchBikes();
                fetchStations();
            } else {
                showMessage(data.message || 'Failed to move bike', 'error');
            }
        } catch (error) {
            console.error('Error moving bike:', error);
            showMessage('Error moving bike', 'error');
        }
    };

    // Handle add bike
    const handleAddBike = async (e) => {
        e.preventDefault();
        
        if (!newBike.bikeId || !newBike.stationId) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/bikes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id.toString(),
                    'x-user-role': user.role,
                    'x-username': user.username || user.email || `user_${user.id}`
                },
                body: JSON.stringify({
                    bike_id: newBike.bikeId,
                    model: newBike.type,
                    location: newBike.stationId,
                    battery_level: newBike.type === 'e-bike' ? 100 : null
                })
            });

            const data = await response.json();

            if (data.message || response.ok) {
                showMessage(`Bike ${newBike.bikeId} added successfully`, 'success');
                setNewBike({ bikeId: '', type: 'standard', stationId: '' });
                fetchBikes();
                fetchStations();
            } else {
                showMessage(data.message || 'Failed to add bike', 'error');
            }
        } catch (error) {
            console.error('Error adding bike:', error);
            showMessage('Error adding bike', 'error');
        }
    };

    return (
        <div className="manage-container">
            <div className="manage-header">
                <h1 className="manage-title">Operator Management</h1>
                <p className="manage-subtitle">Manage bikes and stations</p>
            </div>

            {/* Damage Report Notifications */}
            <DamageReportNotifications user={user} />

            {message && (
                <div className={`manage-message ${messageType}`}>
                    {message}
                </div>
            )}

            <div className="manage-tabs">
                <button 
                    className={`tab-button ${activeTab === 'stations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stations')}
                >
                    Stations
                </button>
                <button 
                    className={`tab-button ${activeTab === 'bikes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bikes')}
                >
                    Bikes
                </button>
            </div>

            {loading ? (
                <div className="manage-loading">Loading...</div>
            ) : (
                <>
                    {activeTab === 'stations' && (
                        <div className="tab-content">
                            <div className="section-header">
                                <h2>Station Management</h2>
                                <p>Total Stations: {stations.length}</p>
                            </div>

                            <div className="stations-grid">
                                {stations.map(station => (
                                    <div key={station.id} className="station-card">
                                        <div className="station-card-header">
                                            <h3>{station.name}</h3>
                                            <span className={`status-badge ${station.status}`}>
                                                {station.status === 'out_of_service' ? '🔴 Out of Service' : '🟢 Active'}
                                            </span>
                                        </div>
                                        
                                        <div className="station-info">
                                            <p><strong>ID:</strong> {station.id}</p>
                                            <p><strong>Address:</strong> {station.address}</p>
                                            <p><strong>Capacity:</strong> {station.capacity} docks</p>
                                            <p><strong>Bikes Docked:</strong> {station.numberOfBikesDocked}</p>
                                            <p><strong>Available:</strong> {station.bikesAvailable}</p>
                                            <p><strong>Reserved:</strong> {station.reservedBikesCount || 0}</p>
                                            <p><strong>Maintenance:</strong> {station.maintenanceBikesCount || 0}</p>
                                        </div>

                                        <button 
                                            className={`station-action-btn ${station.status === 'out_of_service' ? 'activate' : 'deactivate'}`}
                                            onClick={() => toggleStationStatus(station.id, station.status)}
                                        >
                                            {station.status === 'out_of_service' ? 'Put In Service' : 'Take Out of Service'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'bikes' && (
                        <div className="tab-content">
                            <div className="section-header">
                                <h2>Bike Management</h2>
                                <p>Total Bikes: {bikes.length}</p>
                            </div>

                            {/* Add Bike Form */}
                            <div className="form-section">
                                <h3>Add New Bike</h3>
                                <form onSubmit={handleAddBike} className="manage-form">
                                    <div className="form-row">
                                        <input
                                            type="text"
                                            placeholder="Bike ID (e.g., BIKE123)"
                                            value={newBike.bikeId}
                                            onChange={(e) => setNewBike({...newBike, bikeId: e.target.value})}
                                            className="form-input"
                                        />
                                        <select
                                            value={newBike.type}
                                            onChange={(e) => setNewBike({...newBike, type: e.target.value})}
                                            className="form-select"
                                        >
                                            <option value="standard">Standard</option>
                                            <option value="e-bike">E-Bike</option>
                                        </select>
                                        <select
                                            value={newBike.stationId}
                                            onChange={(e) => setNewBike({...newBike, stationId: e.target.value})}
                                            className="form-select"
                                        >
                                            <option value="">Select Station</option>
                                            {stations.map(station => (
                                                <option key={station.id} value={station.id}>
                                                    {station.name} ({station.id})
                                                </option>
                                            ))}
                                        </select>
                                        <button type="submit" className="form-submit-btn">
                                            Add Bike
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Move Bike Form */}
                            <div className="form-section">
                                <h3>Move Bike Between Stations</h3>
                                <form onSubmit={handleMoveBike} className="manage-form">
                                    <div className="form-row">
                                        <select
                                            value={moveBike.bikeId}
                                            onChange={(e) => setMoveBike({...moveBike, bikeId: e.target.value})}
                                            className="form-select"
                                        >
                                            <option value="">Select Bike</option>
                                            {bikes.filter(b => b.status !== 'on_trip').map(bike => (
                                                <option key={bike.id} value={bike.id}>
                                                    {bike.id} ({bike.type}) - {bike.stationName}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={moveBike.fromStationId}
                                            onChange={(e) => setMoveBike({...moveBike, fromStationId: e.target.value})}
                                            className="form-select"
                                        >
                                            <option value="">From Station</option>
                                            {stations.map(station => (
                                                <option key={station.id} value={station.id}>
                                                    {station.name}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={moveBike.toStationId}
                                            onChange={(e) => setMoveBike({...moveBike, toStationId: e.target.value})}
                                            className="form-select"
                                        >
                                            <option value="">To Station</option>
                                            {stations.map(station => (
                                                <option key={station.id} value={station.id}>
                                                    {station.name}
                                                </option>
                                            ))}
                                        </select>
                                        <button type="submit" className="form-submit-btn">
                                            Move Bike
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Bikes List */}
                            <div className="bikes-table-container">
                                <table className="bikes-table">
                                    <thead>
                                        <tr>
                                            <th>Bike ID</th>
                                            <th>Type</th>
                                            <th>Status</th>
                                            <th>Station</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bikes.map(bike => (
                                            <tr key={bike.id}>
                                                <td><strong>{bike.id}</strong></td>
                                                <td>
                                                    {bike.type === 'e-bike' ? 'E-Bike' : 'Standard'}
                                                </td>
                                                <td>
                                                    <span className={`bike-status-badge ${bike.status}`}>
                                                        {bike.status === 'available' && '🟢 Available'}
                                                        {bike.status === 'reserved' && '🟡 Reserved'}
                                                        {bike.status === 'on_trip' && '🔵 On Trip'}
                                                        {bike.status === 'maintenance' && '🔴 Maintenance'}
                                                    </span>
                                                </td>
                                                <td>{bike.stationName || 'N/A'}</td>
                                                <td>
                                                    {bike.status !== 'on_trip' && (
                                                        <button
                                                            className={`bike-action-btn ${bike.status === 'maintenance' ? 'activate' : 'deactivate'}`}
                                                            onClick={() => toggleBikeStatus(bike.id, bike.status, bike.stationId)}
                                                        >
                                                            {bike.status === 'maintenance' ? 'Activate' : 'Maintenance'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ManageBikes;
