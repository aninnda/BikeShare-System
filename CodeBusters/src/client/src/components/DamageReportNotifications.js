import React, { useState, useEffect } from 'react';
import './style/DamageReportNotifications.css';

const DamageReportNotifications = ({ user }) => {
    const [notifications, setNotifications] = useState([]);
    const [damageReports, setDamageReports] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fetch notifications on component mount
    useEffect(() => {
        if (user && (user.role === 'operator' || user.role === 'dual')) {
            fetchNotifications();
            fetchDamageReports();
        }
    }, [user]);

    const fetchNotifications = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/operator/notifications?unread=true', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'x-user-id': String(user.id),
                    'x-user-role': user.role
                }
            });

            const data = await response.json();
            if (data.success) {
                setNotifications(data.notifications || []);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const fetchDamageReports = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/operator/damage-reports?status=pending', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'x-user-id': String(user.id),
                    'x-user-role': user.role
                }
            });

            const data = await response.json();
            if (data.success) {
                setDamageReports(data.reports || []);
            }
        } catch (error) {
            console.error('Error fetching damage reports:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await fetch(`http://localhost:5001/api/operator/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'x-user-id': String(user.id),
                    'x-user-role': user.role
                }
            });
            fetchNotifications();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const resolveReport = async (reportId) => {
        try {
            setLoading(true);
            await fetch(`http://localhost:5001/api/operator/damage-reports/${reportId}/resolve`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'x-user-id': String(user.id),
                    'x-user-role': user.role
                }
            });
            fetchDamageReports();
            setLoading(false);
            alert('Damage report marked as resolved');
        } catch (error) {
            console.error('Error resolving report:', error);
            setLoading(false);
            alert('Error resolving report');
        }
    };

    const unreadCount = notifications.filter(n => n.read === 0).length;
    const pendingReportsCount = damageReports.length;

    if (unreadCount === 0 && pendingReportsCount === 0) {
        return null; // Don't show anything if no notifications
    }

    return (
        <>
            <div className="damage-notification-banner">
                <div className="notification-content">
                    <span className="notification-icon">⚠️</span>
                    <div className="notification-text">
                        <strong>Operator Alert:</strong> {pendingReportsCount} damaged bike{pendingReportsCount !== 1 ? 's' : ''} reported
                        {unreadCount > 0 && ` • ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
                    </div>
                    <button 
                        className="view-details-btn" 
                        onClick={() => setShowModal(true)}
                    >
                        View Details
                    </button>
                </div>
            </div>

            {showModal && (
                <div className="damage-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="damage-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>⚠️ Damage Reports & Notifications</h2>
                            <button 
                                className="close-modal-btn" 
                                onClick={() => setShowModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="modal-body">
                            {/* Damage Reports Section */}
                            <div className="reports-section">
                                <h3>Pending Damage Reports ({pendingReportsCount})</h3>
                                {damageReports.length === 0 ? (
                                    <p className="no-reports">No pending damage reports</p>
                                ) : (
                                    <div className="reports-list">
                                        {damageReports.map(report => (
                                            <div key={report.id} className="report-card">
                                                <div className="report-header">
                                                    <span className="report-id">Report #{report.id}</span>
                                                    <span className="report-status">{report.status}</span>
                                                </div>
                                                <div className="report-details">
                                                    <p><strong>Bike:</strong> {report.bike_id}</p>
                                                    <p><strong>Location:</strong> {report.station_name || report.station_id}</p>
                                                    <p><strong>Reported by:</strong> {report.username} (User #{report.user_id})</p>
                                                    <p><strong>Time:</strong> {new Date(report.reported_at).toLocaleString()}</p>
                                                    <p><strong>Description:</strong> {report.description}</p>
                                                </div>
                                                <button 
                                                    className="resolve-btn"
                                                    onClick={() => resolveReport(report.id)}
                                                    disabled={loading}
                                                >
                                                    Mark as Resolved
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Notifications Section */}
                            <div className="notifications-section">
                                <h3>Recent Notifications ({unreadCount} unread)</h3>
                                {notifications.length === 0 ? (
                                    <p className="no-notifications">No notifications</p>
                                ) : (
                                    <div className="notifications-list">
                                        {notifications.map(notif => (
                                            <div 
                                                key={notif.id} 
                                                className={`notification-card ${notif.read === 0 ? 'unread' : 'read'}`}
                                            >
                                                <div className="notif-content">
                                                    <p>{notif.message}</p>
                                                    <span className="notif-time">
                                                        {new Date(notif.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                {notif.read === 0 && (
                                                    <button 
                                                        className="mark-read-btn"
                                                        onClick={() => markAsRead(notif.id)}
                                                    >
                                                        Mark Read
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DamageReportNotifications;
