import React from 'react';
import Navbar from './Navbar';
import RiderNavbar from './RiderNavbar';
import OperatorNavbar from './OperatorNavbar';

const RoleBasedNavbar = ({ user, onLogout }) => {
    // If no user is logged in, show default navbar
    if (!user) {
        return <Navbar />;
    }

    // Show navbar based on user role
    switch (user.role) {
        case 'rider':
            return <RiderNavbar user={user} onLogout={onLogout} />;
        case 'operator':
            return <OperatorNavbar user={user} onLogout={onLogout} />;
        default:
            return <Navbar />;
    }
};

export default RoleBasedNavbar;