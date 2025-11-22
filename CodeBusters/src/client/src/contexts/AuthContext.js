import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tierNotification, setTierNotification] = useState(null);

    // Check for stored user data on app load
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Error parsing stored user data:', error);
                localStorage.removeItem('user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const setLoginTierNotification = (notification) => {
        setTierNotification(notification);
    };

    const clearTierNotification = () => {
        setTierNotification(null);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const updateUserLoyaltyTier = (loyaltyTier) => {
        if (user) {
            const updatedUser = {
                ...user,
                loyaltyTier
            };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
    };

    const value = {
        user,
        login,
        logout,
        isLoading,
        updateUserLoyaltyTier,
        tierNotification,
        setLoginTierNotification,
        clearTierNotification
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;