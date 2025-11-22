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
                {user && user.role === 'dual' && (
                    <NavLink to="/profile">
                        Profile
                    </NavLink>
                )}
                {/* Dual view switching moved to Account Role in Profile */}
            <NavLink to="/plans">
                Plans
            </NavLink>
        </div>
        <div className="operator-user-info">
            <span className="operator-username">
                {user?.username} (Operator)
            </span>
            {user?.role === 'dual' && (
                <select 
                    value="operator"
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
                        backgroundColor: '#1a5490',
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
                className="operator-logout-button"
            >
                Logout
            </button>
        </div>
    </nav>
);

export default OperatorNavbar;