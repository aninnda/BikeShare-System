import React from 'react';
import { Link } from 'react-router-dom';
import './style/OperatorNavbar.css';

const NavLink = ({ to, children }) => {
    return (
        <Link to={to} className="operator-nav-link">
            {children}
        </Link>
    );
};

const OperatorNavbar = ({ user, onLogout }) => (
    <nav className="operator-navbar">
        <div className="operator-nav-links">
            <NavLink to="/">
                Home
            </NavLink>
            <NavLink to="/operator/bikes">
                Manage Bikes
            </NavLink>
            <NavLink to="/map">
                Map
            </NavLink>
            <NavLink to="/operator/analytics">
                Analytics
            </NavLink>
            <NavLink to="/plans">
                Plans
            </NavLink>
        </div>
        <div className="operator-user-info">
            <span className="operator-username">
                {user?.username} (Operator)
            </span>
            <button 
                onClick={onLogout}
                className="operator-logout-button"
            >
                Logout
            </button>
        </div>
    </nav>
);

export default OperatorNavbar;