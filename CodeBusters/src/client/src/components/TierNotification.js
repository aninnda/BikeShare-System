import React, { useEffect } from 'react';
import './style/TierNotification.css';

const TierNotification = ({ notification, onClose }) => {
    useEffect(() => {
        if (notification) {
            console.log('[TierNotification] Displaying notification:', notification);
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification, onClose]);

    if (!notification) {
        return null;
    }

    const tierColors = {
        bronze: '#CD7F32',
        silver: '#C0C0C0',
        gold: '#FFD700',
        none: '#999'
    };

    const newColor = tierColors[notification.newTier] || '#999';
    const isPromotion = notification.type === 'promotion';

    return (
        <div className={`tier-notification ${notification.type} visible`}>
            <div className="notification-content">
                <p className="notification-message" style={{ color: newColor }}>
                    You're {isPromotion ? 'upgraded' : 'downgraded'} to <strong>{notification.newTier.charAt(0).toUpperCase() + notification.newTier.slice(1)}</strong>
                </p>
            </div>
        </div>
    );
};

export default TierNotification;
