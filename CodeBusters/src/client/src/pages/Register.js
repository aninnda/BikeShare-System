import React, { useState } from 'react';
import './style/Register.css';

const Register = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        address: '',
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

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

        // Validate required fields
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.username || !formData.password) {
            setMessage('Please fill in all required fields');
            setIsLoading(false);
            return;
        }

        // Check if passwords match
        if (formData.password !== formData.confirmPassword) {
            setMessage('Passwords do not match');
            setIsLoading(false);
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setMessage('Please enter a valid email address');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:5001/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    address: formData.address,
                    username: formData.username,
                    password: formData.password
                }),
            });

            const data = await response.json();

            if (data.success) {
                setMessage('Registration successful! Redirecting...');
                setTimeout(() => {
                    window.location.href = 'http://localhost:3000/login';
                }, 500);
            } else {
                setMessage(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            setMessage('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-page">
            <div className="register-overlay"></div>
            <div className="register-container">
                <h2 className="register-title">Join CodeBusters</h2>
                <p className="register-subtitle">Create your account to start your bike sharing journey</p>
                
                {message && (
                    <div className={`register-message ${message.includes('successful') ? 'success' : 'error'}`}>
                        {message}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="register-form">
                    <div className="register-input-group">
                        <label htmlFor="firstName" className="register-label">First Name</label>
                        <input 
                            type="text" 
                            id="firstName" 
                            name="firstName" 
                            value={formData.firstName}
                            onChange={handleChange}
                            required 
                            className="register-input"
                            placeholder="Enter your first name"
                        />
                    </div>

                    <div className="register-input-group">
                        <label htmlFor="lastName" className="register-label">Last Name</label>
                        <input 
                            type="text" 
                            id="lastName" 
                            name="lastName" 
                            value={formData.lastName}
                            onChange={handleChange}
                            required 
                            className="register-input"
                            placeholder="Enter your last name"
                        />
                    </div>

                    <div className="register-input-group">
                        <label htmlFor="email" className="register-label">Email Address</label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            value={formData.email}
                            onChange={handleChange}
                            required 
                            className="register-input"
                            placeholder="Enter your email address"
                        />
                    </div>

                    <div className="register-input-group">
                        <label htmlFor="address" className="register-label">Address</label>
                        <input 
                            type="text" 
                            id="address" 
                            name="address" 
                            value={formData.address}
                            onChange={handleChange}
                            className="register-input"
                            placeholder="Enter your address (optional)"
                        />
                    </div>

                    <div className="register-input-group">
                        <label htmlFor="username" className="register-label">Username</label>
                        <input 
                            type="text" 
                            id="username" 
                            name="username" 
                            value={formData.username}
                            onChange={handleChange}
                            required 
                            className="register-input"
                            placeholder="Enter your username"
                        />
                    </div>
                    
                    <div className="register-input-group">
                        <label htmlFor="password" className="register-label">Password</label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password" 
                            value={formData.password}
                            onChange={handleChange}
                            required 
                            className="register-input"
                            placeholder="Enter your password"
                        />
                    </div>
                    
                    <div className="register-input-group">
                        <label htmlFor="confirmPassword" className="register-label">Confirm Password</label>
                        <input 
                            type="password" 
                            id="confirmPassword" 
                            name="confirmPassword" 
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required 
                            className="register-input"
                            placeholder="Confirm your password"
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="register-button"
                    >
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>
                
                <div className="register-footer">
                    Already have an account? <a href="/login" className="register-link">Sign in here</a>
                </div>
            </div>
        </div>
    );
};

export default Register;