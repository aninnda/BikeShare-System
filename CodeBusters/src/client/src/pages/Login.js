import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import TierNotification from '../components/TierNotification';
import './style/Login.css';

const Login = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [tierNotification, setTierNotification] = useState(null);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setTierNotification(null);

        try {
            const response = await fetch('http://localhost:5001/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                setMessage('Login successful! Redirecting...');
                
                // Show tier notification if user's tier changed
                if (data.tierNotification) {
                    setTierNotification(data.tierNotification);
                }
                
                // Use the login function from AuthContext
                login(data.user);
                
                // Redirect based on user role (with delay to show notification)
                setTimeout(() => {
                    navigate('/');
                }, data.tierNotification ? 2000 : 500);
            } else {
                setMessage(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            setMessage('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <TierNotification 
                notification={tierNotification}
                onClose={() => setTierNotification(null)}
            />
            
            <div className="login-page">
                {/* Overlay for better text readability */}
                <div className="login-overlay"></div>
                
                <div className="login-container">
                    <h2 className="login-title">Welcome Back</h2>
                    
                    {message && (
                        <div className={`login-message ${message.includes('successful') ? 'success' : 'error'}`}>
                            {message}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="login-field">
                            <label htmlFor="username" className="login-label">Username:</label>
                            <input 
                                type="text" 
                                id="username" 
                                name="username" 
                                value={formData.username}
                                onChange={handleChange}
                                required
                                className="login-input"
                            />
                        </div>
                        
                        <div className="login-field">
                            <label htmlFor="password" className="login-label">Password:</label>
                            <input 
                                type="password" 
                                id="password" 
                                name="password" 
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="login-input"
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="login-button"
                        >
                            {isLoading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                    
                    <p className="login-footer">
                        Don't have an account? <a 
                            href="/register" 
                            className="login-link"
                        >Register here</a>
                    </p>
                </div>
            </div>
        </>
    );
};

export default Login;