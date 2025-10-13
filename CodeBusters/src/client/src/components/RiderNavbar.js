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

const RiderNavbar = ({ user, onLogout }) => (
    <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem', 
        padding: '1rem 2rem', 
        background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
        color: 'white',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        borderBottom: '2px solid #333'
    }}>
        <div>
            <NavLink to="/rider/dashboard">
                Dashboard
            </NavLink>
            <NavLink to="/rider/bikes">
                Available Bikes
            </NavLink>
            <NavLink to="/map">
                Map
            </NavLink>
            <NavLink to="/rider/plans">
                Plans
            </NavLink>
            <NavLink to="/rider/rentals">
                My Rentals
            </NavLink>
            <NavLink to="/profile">
                Profile
            </NavLink>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{
                color: 'white',
                fontWeight: 'bold'
            }}>{user?.username}</span>
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

export default RiderNavbar;