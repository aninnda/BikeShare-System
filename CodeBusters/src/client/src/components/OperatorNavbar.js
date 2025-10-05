import React from 'react';
import { Link } from 'react-router-dom';

const OperatorNavbar = ({ user, onLogout }) => (
    <nav style={{ 
        display: 'flex',
        background: '#922338',
        color: 'white',
        padding: '1rem',
        justifyContent: 'space-between',
        alignItems: 'center'
    }}>
        <div>
            <Link to="/operator/dashboard" >
                Dashboard
            </Link>
            <Link to="/operator/bikes">
                Manage Bikes
            </Link>
            <Link to="/operator/users">
                Manage Users
            </Link>
            <Link to="/operator/rentals">
                All Rentals
            </Link>
            <Link to="/operator/analytics">
                Analytics
            </Link>
        </div>
        <div>
            <span>{user?.username} (Operator)</span>
            <button 
                onClick={onLogout}
            >
                Logout
            </button>
        </div>
    </nav>
);

export default OperatorNavbar;