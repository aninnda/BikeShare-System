import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import RiderNavbar from './RiderNavbar';
import OperatorNavbar from './OperatorNavbar';

const RoleBasedNavbar = ({ user, onLogout }) => {
    // For dual users allow switching between operator and rider views.
    // Hooks must be called unconditionally at the top-level of the component.
    const [dualView, setDualView] = useState(() => {
        try {
            return localStorage.getItem('dual_view') || 'operator';
        } catch (e) {
            return 'operator';
        }
    });

    useEffect(() => {
        const handler = (e) => {
            if (e && e.detail) setDualView(e.detail);
            else {
                try {
                    setDualView(localStorage.getItem('dual_view') || 'operator');
                } catch (err) {
                    setDualView('operator');
                }
            }
        };
        window.addEventListener('dualViewChange', handler);
        return () => window.removeEventListener('dualViewChange', handler);
    }, []);

    // If no user is logged in, show default navbar
    if (!user) return <Navbar />;

    if (user.role === 'dual') {
        return dualView === 'rider'
            ? <RiderNavbar user={user} onLogout={onLogout} />
            : <OperatorNavbar user={user} onLogout={onLogout} />;
    }

    if (user.role === 'rider') return <RiderNavbar user={user} onLogout={onLogout} />;
    if (user.role === 'operator') return <OperatorNavbar user={user} onLogout={onLogout} />;

    return <Navbar />;
};

export default RoleBasedNavbar;