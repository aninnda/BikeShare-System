import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Helper for notification icons
const getNotificationIcon = (type) => {
    switch (type) {
        case 'station_empty':
            return '🅾️';
        case 'station_full':
            return '🈵';
        default:
            return '🔔';
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

const ActivityHistory = ({ userId }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchActivityHistory = async () => {
        if (!userId) return;
        
        try {
            setLoading(true);
            setError('');
            
            const response = await fetch(`http://localhost:5001/api/users/${userId}/activity?limit=20`);
            const data = await response.json();
            
            if (data.success) {
                setActivities(data.activities);
                console.log('Loaded activities:', data.activities);
            } else {
                setError('Failed to load activity history');
            }
        } catch (err) {
            console.error('Error fetching activity history:', err);
            setError('Error loading activity history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivityHistory();
    }, [userId]);

    // Listen for reservation/rental events to refresh the history
    useEffect(() => {
        const handleActivityChange = () => {
            console.log('Activity change detected, refreshing history...');
            fetchActivityHistory();
        };

        // Listen for custom events that indicate new activities
        window.addEventListener('reservationMade', handleActivityChange);
        window.addEventListener('reservationCancelled', handleActivityChange);
        window.addEventListener('rentalStarted', handleActivityChange);
        window.addEventListener('rentalEnded', handleActivityChange);

        return () => {
            window.removeEventListener('reservationMade', handleActivityChange);
            window.removeEventListener('reservationCancelled', handleActivityChange);
            window.removeEventListener('rentalStarted', handleActivityChange);
            window.removeEventListener('rentalEnded', handleActivityChange);
        };
    }, [userId]);

    // Get activity type styling and icons
    const getActivityStyle = (type) => {
        switch (type) {
            case 'bike_reserved':
                return {
                    icon: '📅',
                    color: '#17a2b8',
                    bgColor: '#e3f4f7',
                    label: 'Reserved'
                };
            case 'rental_started':
                return {
                    icon: '🚴‍♂️',
                    color: '#28a745',
                    bgColor: '#e8f5e8',
                    label: 'Rental Started'
                };
            case 'rental_completed':
                return {
                    icon: '🏁',
                    color: '#6f42c1',
                    bgColor: '#f0e6ff',
                    label: 'Rental Completed'
                };
            case 'reservation_cancelled':
                return {
                    icon: '❌',
                    color: '#dc3545',
                    bgColor: '#ffe6e6',
                    label: 'Reservation Cancelled'
                };
            default:
                return {
                    icon: '📋',
                    color: '#6c757d',
                    bgColor: '#f8f9fa',
                    label: 'Activity'
                };
        }
    };

    // Format timestamp for display
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return `Today at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        } else if (diffDays === 1) {
            return `Yesterday at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        } else if (diffDays < 7) {
            return `${diffDays} days ago at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        } else {
            return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
    };

    const activityHistoryStyle = {
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        border: '1px solid #e9ecef'
    };

    const activityCardStyle = (type) => {
        const style = getActivityStyle(type);
        return {
            backgroundColor: '#ffffff',
            padding: '18px',
            marginBottom: '12px',
            borderRadius: '12px',
            border: '1px solid #dee2e6',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            borderLeft: `4px solid ${style.color}`
        };
    };

    const activityHeaderStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px'
    };

    return (
        <div style={activityHistoryStyle}>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px' 
            }}>
                <h3 style={{ margin: 0, color: '#333', fontSize: '1.4rem' }}>
                    📋 Activity History
                </h3>
                <button
                    onClick={fetchActivityHistory}
                    disabled={loading}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        opacity: loading ? 0.6 : 1
                    }}
                >
                    {loading ? 'Refreshing...' : '🔄 Refresh'}
                </button>
            </div>
            
            {loading && <p>Loading activity history...</p>}
            {error && <p style={{ color: '#dc3545' }}>{error}</p>}
            
            {activities.length === 0 && !loading && !error && (
                <p style={{ fontStyle: 'italic', color: '#6c757d', textAlign: 'center', padding: '20px' }}>
                    No activities yet. Start reserving or renting bikes to see your history here!
                </p>
            )}
            
            {activities.map(activity => {
                const style = getActivityStyle(activity.type);
                // Always show cost for completed rentals using backend value if available, fallback to dynamic calculation
                let cost = null;
                let ratePerMinute = null;
                let bikeType = activity.bikeType || activity.bike_type_raw || '';
                // Always bill at least 1 minute
                let durationMinutes = Math.max(1, activity.duration_minutes || activity.duration?.minutes || 0);
                if (activity.type === 'rental_completed') {
                    // Prefer backend-provided cost
                    if (typeof activity.cost === 'number' && !isNaN(activity.cost)) {
                        // If backend cost is 0 but duration is less than a minute, still bill for 1 minute
                        if (activity.cost === 0 && durationMinutes === 1) {
                            ratePerMinute = (bikeType === 'e-bike' || bikeType === 'electric') ? 0.25 : 0.10;
                            cost = ratePerMinute.toFixed(2);
                        } else {
                            cost = activity.cost.toFixed(2);
                        }
                    } else {
                        // Fallback to dynamic calculation
                        ratePerMinute = (bikeType === 'e-bike' || bikeType === 'electric') ? 0.25 : 0.10;
                        cost = (durationMinutes * ratePerMinute).toFixed(2);
                    }
                    // Set rate for display
                    if (!ratePerMinute) {
                        ratePerMinute = (bikeType === 'e-bike' || bikeType === 'electric') ? 0.25 : 0.10;
                    }
                }
                return (
                    <div key={activity.id} style={activityCardStyle(activity.type)}>
                        <div style={activityHeaderStyle}>
                            <div style={{ flex: 1 }}>
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    marginBottom: '8px' 
                                }}>
                                    <span style={{ 
                                        fontSize: '1.2rem', 
                                        marginRight: '8px' 
                                    }}>
                                        {style.icon}
                                    </span>
                                    <span style={{
                                        fontWeight: 'bold',
                                        color: style.color,
                                        fontSize: '0.9rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        {style.label}
                                    </span>
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                    <strong style={{ fontSize: '1.1rem' }}>
                                        🚲 {activity.bikeId}
                                    </strong>
                                    {bikeType && (
                                        <span style={{ 
                                            marginLeft: '10px', 
                                            padding: '3px 10px', 
                                            backgroundColor: (bikeType === 'e-bike' || bikeType === 'electric') ? '#007bff' : '#6c757d',
                                            color: 'white',
                                            borderRadius: '15px',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {(bikeType === 'e-bike' || bikeType === 'electric') ? '⚡ E-Bike' : '🚴 Standard'}
                                        </span>
                                    )}
                                </div>
                                <div style={{ 
                                    fontSize: '0.9rem', 
                                    color: '#555', 
                                    lineHeight: '1.4'
                                }}>
                                    {activity.description}
                                </div>
                            </div>
                            <div style={{ 
                                textAlign: 'right',
                                minWidth: '120px'
                            }}>
                                <div style={{
                                    fontSize: '0.85rem',
                                    color: '#6c757d',
                                    marginBottom: '4px'
                                }}>
                                    {formatTimestamp(activity.timestamp)}
                                </div>
                                {/* Always show cost for completed rentals */}
                                {activity.type === 'rental_completed' && (
                                    <div style={{
                                        fontSize: '1.1rem',
                                        fontWeight: 'bold',
                                        color: (bikeType === 'e-bike' || bikeType === 'electric') ? '#1976d2' : '#28a745'
                                    }}>
                                        ${cost}
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Additional details for completed rentals */}
                        {activity.type === 'rental_completed' && (
                            <>
                                {/* Prominent Cost Calculation Box */}
                                <div style={{
                                    marginTop: '12px',
                                    padding: '16px',
                                    backgroundColor: (bikeType === 'e-bike' || bikeType === 'electric') ? '#e3f2fd' : '#f8f9fa',
                                    border: `2px solid ${(bikeType === 'e-bike' || bikeType === 'electric') ? '#2196f3' : '#28a745'}`,
                                    borderRadius: '12px',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '1.2rem'
                                }}>
                                    💰 ${cost}
                                    <div style={{
                                        fontSize: '0.95rem',
                                        color: '#666',
                                        fontWeight: '500',
                                        marginTop: '4px'
                                    }}>
                                        {durationMinutes} min × ${ratePerMinute?.toFixed(2)}/min
                                        <span style={{ fontSize: '0.8rem', fontStyle: 'italic', marginLeft: 8 }}>
                                            {(bikeType === 'e-bike' || bikeType === 'electric') ? '⚡ E-Bike Rate' : '🚴 Standard Rate'}
                                        </span>
                                    </div>
                                </div>
                                {/* Trip Details Grid */}
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                    gap: '12px', 
                                    marginTop: '12px',
                                    padding: '12px',
                                    backgroundColor: style.bgColor,
                                    borderRadius: '8px',
                                    fontSize: '0.9rem'
                                }}>
                                    <div>📍 <strong>From:</strong> {activity.startStation}</div>
                                    <div>🏁 <strong>To:</strong> {activity.endStation}</div>
                                    <div>⏱️ <strong>Duration:</strong> {activity.duration?.formatted || durationMinutes + ' min'}</div>
                                    <div>🚲 <strong>Bike Type:</strong> {(bikeType === 'e-bike' || bikeType === 'electric') ? '⚡ E-Bike' : '🚴 Standard'}</div>
                                </div>
                            </>
                        )}
                        {/* Additional details for reservations */}
                        {activity.type === 'bike_reserved' && activity.station && (
                            <div style={{ 
                                marginTop: '8px',
                                padding: '8px 12px',
                                backgroundColor: style.bgColor,
                                borderRadius: '8px',
                                fontSize: '0.9rem'
                            }}>
                                📍 <strong>Station:</strong> {activity.station}
                            </div>
                        )}
                        
                        {/* Additional details for rental starts */}
                        {activity.type === 'rental_started' && activity.station && (
                            <div style={{ 
                                marginTop: '8px',
                                padding: '8px 12px',
                                backgroundColor: style.bgColor,
                                borderRadius: '8px',
                                fontSize: '0.9rem'
                            }}>
                                📍 <strong>Started at:</strong> {activity.station}
                            </div>
                        )}
                    </div>
                );
            })}
            
            {activities.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                        Showing last {activities.length} activities
                    </span>
                </div>
            )}
        </div>
    );
};

const Profile = () => {
    // Notifications state
    const [stationNotifications, setStationNotifications] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const [notifError, setNotifError] = useState('');

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

    // Declare currentView before any useEffect that uses it
    const [currentView, setCurrentView] = useState(hasIncompleteProfile ? 'edit' : 'profile'); // profile, edit, history, notifications
    const [isEditing, setIsEditing] = useState(hasIncompleteProfile);
    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        address: user?.address || ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Fetch notifications when notifications view is opened
    useEffect(() => {
        if (currentView === 'notifications') {
            fetchStationNotifications();
        }
    }, [currentView]);

    // Initialize view based on profile completeness
    useEffect(() => {
        if (hasIncompleteProfile) {
            setCurrentView('edit');
            setIsEditing(true);
        }
    }, [hasIncompleteProfile]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleEdit = () => {
        setIsEditing(true);
        setCurrentView('edit');
        setMessage('');
        // Reset form data to current user data
        setFormData({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            address: user?.address || ''
        });
    };

    const handleCancel = () => {
        // Don't allow canceling if profile is incomplete
        if (hasIncompleteProfile) {
            setMessage('Please complete your profile information');
            return;
        }
        
        setIsEditing(false);
        setMessage('');
        setCurrentView('profile'); // Return to profile view
        // Reset form data to original values
        setFormData({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            address: user?.address || ''
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

    const editButtonStyle = {
        ...buttonStyle,
        background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
        color: 'white',
        width: '100%'
    };

    const messageStyle = {
        padding: '12px 20px',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center',
        fontWeight: '500',
        backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da',
        color: message.includes('success') ? '#155724' : '#721c24',
        border: `1px solid ${message.includes('success') ? '#c3e6cb' : '#f5c6cb'}`
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

    const menuButtonStyle = {
        ...buttonStyle,
        color: 'white',
        marginBottom: '15px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '1.1rem',
        fontWeight: '600',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
        transform: 'translateY(0)',
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)'
        }
    };

    const backButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#6c757d',
        color: 'white',
        width: 'auto',
        minWidth: '150px'
    };

    const notificationsStyle = {
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef'
    };

    const sectionTitleStyle = {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#333',
        marginBottom: '20px',
        textAlign: 'center'
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
                    👤 My Profile
                </button>
                
                <button
                    onClick={() => {
                        setCurrentView('edit');
                        setIsEditing(true);
                        setMessage('');
                    }}
                    style={currentView === 'edit' ? activeSidebarButtonStyle : {...sidebarButtonStyle, background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'}}
                >
                    ✏️ Edit Profile
                </button>
                
                <button
                    onClick={() => setCurrentView('history')}
                    style={currentView === 'history' ? activeSidebarButtonStyle : {...sidebarButtonStyle, background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'}}
                >
                    📊 Ride History
                </button>
                
                <button
                    onClick={() => setCurrentView('notifications')}
                    style={currentView === 'notifications' ? activeSidebarButtonStyle : {...sidebarButtonStyle, background: 'linear-gradient(135deg, #ff7b7b 0%, #ff6b6b 100%)'}}
                >
                    🔔 Notifications
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
                                    📝 Complete your profile information to get the most out of your BikeShare experience!
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
                            <h2 style={titleStyle}>📊 Ride History</h2>
                            <ActivityHistory userId={user?.id} />
                        </>
                    )}

                    {/* Notifications View */}
                    {currentView === 'notifications' && (
                        <>
                            <h2 style={titleStyle}>🔔 Notifications</h2>
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