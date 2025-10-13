import React from 'react';
import { Link } from 'react-router-dom';

const linkStyle = {
    color: 'white',
    textDecoration: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    display: 'inline-block',
    fontWeight: 'bold',
    fontSize: '1rem'
};

const NavLink = ({ to, children }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    
    return (
        <Link 
            to={to}
            style={{
                ...linkStyle,
                backgroundColor: isHovered ? 'rgba(211, 211, 211, 0.3)' : 'transparent',
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: isHovered ? '0 6px 15px rgba(0, 0, 0, 0.4)' : 'none'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {children}
        </Link>
    );
};

const Navbar = () => (
    <nav style={{ 
        display: 'flex', 
        gap: '1rem', 
        padding: '1rem 2rem', 
        background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        borderBottom: '2px solid #333',
        alignItems: 'center'
    }}>
                <NavLink to="/">Home</NavLink>
        <NavLink to="/plans">Plans</NavLink>
        <NavLink to="/login">Login</NavLink>
        <NavLink to="/register">Register</NavLink>
        <NavLink to="/content">Content</NavLink>
    </nav>
);

export default Navbar;