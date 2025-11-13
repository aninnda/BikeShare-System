import React from 'react';
import { Link } from 'react-router-dom';
import './style/Navbar.css';

const NavLink = ({ to, children }) => {
    return (
        <Link to={to} className="nav-link">
            {children}
        </Link>
    );
};

const Navbar = () => (
    <nav className="navbar">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/plans">Plans</NavLink>
        <NavLink to="/login">Login</NavLink>
        <NavLink to="/register">Register</NavLink>
    </nav>
);

export default Navbar;