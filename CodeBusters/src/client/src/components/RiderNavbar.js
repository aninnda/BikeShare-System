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
            <NavLink to="/leaderboard">
                Leaderboard
            </NavLink>
            <NavLink to="/profile">
                Profile
            </NavLink>
        </div>
        <div className="rider-user-info">
            <span className="rider-username">
                {user?.username}
            </span>
            {user?.role === 'dual' && (
                <select 
                    value="rider"
                    onChange={(e) => {
                        const newView = e.target.value;
                        localStorage.setItem('dual_view', newView);
                        window.dispatchEvent(new CustomEvent('dualViewChange', { detail: newView }));
                    }}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '2px solid #fff',
                        fontSize: '14px',
                        backgroundColor: '#922338',
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        marginRight: '10px'
                    }}
                >
                    <option value="rider"> Rider View</option>
                    <option value="operator"> Operator View</option>
                </select>
            )}
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