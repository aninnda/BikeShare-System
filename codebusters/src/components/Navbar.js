import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => (
    <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#922338' }}>
        <Link to="/">Home</Link>
        <Link to="/login">Login</Link>
        <Link to="/content">Content</Link>
    </nav>
);

export default Navbar;