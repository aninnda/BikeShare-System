import React from 'react';
import { Link } from 'react-router-dom';

const RiderNavbar = ({ user, onLogout }) => (
    <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem', 
        padding: '1rem', 
        background: '#922338',
        color: 'white'
    }}>
        <div>
            <Link to="/rider/dashboard">
                Dashboard
            </Link>
            <Link to="/rider/bikes">
                Available Bikes
            </Link>
            <Link to="/rider/rentals">
                My Rentals
            </Link>
            <Link to="/rider/profile">
                Profile
            </Link>
        </div>
        <div>
            <span>{user?.username}</span>
            <button onClick={onLogout}>
                Logout
            </button>
        </div>
    </nav>
);

export default RiderNavbar;