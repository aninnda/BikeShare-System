import React from 'react';
import { Link } from 'react-router-dom';
import './style/RiderNavbar.css';

const NavLink = ({ to, children }) => {
    return (
        <Link to={to} className="rider-nav-link">
            {children}
        </Link>
    );
};

const RiderNavbar = ({ user, onLogout }) => (
    <nav className="rider-navbar">
        <div className="rider-nav-links">
            <NavLink to="/">
                Home
            </NavLink>
            <NavLink to="/rider/bikes">
                Available Bikes
            </NavLink>
            <NavLink to="/map">
                Map
            </NavLink>
            <NavLink to="/plans">
                Plans
            </NavLink>
            <NavLink to="/rider/rentals">
                My Rentals
            </NavLink>
            <NavLink to="/profile">
                Profile
            </NavLink>
        </div>
        <div className="rider-user-info">
            <span className="rider-username">
                {user?.username}
            </span>
            <button 
                onClick={onLogout}
                className="rider-logout-button"
            >
                Logout
            </button>
        </div>
    </nav>
);

export default RiderNavbar;