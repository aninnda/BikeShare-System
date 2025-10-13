import React from 'react';
import { Link } from 'react-router-dom';

// CSS for hover effects
const linkStyle = {
    marginRight: '15px',
    color: 'white',
    textDecoration: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    display: 'inline-block',
    fontWeight: 'bold',
    fontSize: '1rem'
};

const linkHoverStyle = {
    backgroundColor: 'rgba(211, 211, 211, 0.3)',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 15px rgba(0, 0, 0, 0.4)'
};

const NavLink = ({ to, children }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    
    return (
        <Link 
            to={to}
            style={{
                ...linkStyle,
                ...(isHovered ? linkHoverStyle : {})
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {children}
        </Link>
    );
};

const OperatorNavbar = ({ user, onLogout }) => (
    <nav style={{ 
        display: 'flex',
        background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
        color: 'white',
        padding: '1rem 2rem',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        borderBottom: '2px solid #333'
    }}>
        <div>
            <NavLink to="/operator/dashboard">
                Dashboard
            </NavLink>
            <NavLink to="/operator/bikes">
                Manage Bikes
            </NavLink>
            <NavLink to="/map">
                Map
            </NavLink>
            <NavLink to="/operator/users">
                Manage Users
            </NavLink>
            <NavLink to="/operator/rentals">
                All Rentals
            </NavLink>
            <NavLink to="/operator/analytics">
                Analytics
            </NavLink>
            <NavLink to="/profile">
                Profile
            </NavLink>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{
                color: 'white',
                fontWeight: 'bold'
            }}>{user?.username} (Operator)</span>
            <button 
                onClick={onLogout}
                style={{
                    padding: '10px 18px',
                    backgroundColor: 'transparent',
                    color: 'white',
                    border: '2px solid white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                    e.target.style.backgroundColor = 'rgba(211, 211, 211, 0.3)';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 15px rgba(0, 0, 0, 0.4)';
                }}
                onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                }}
            >
                Logout
            </button>
        </div>
    </nav>
);

export default OperatorNavbar;