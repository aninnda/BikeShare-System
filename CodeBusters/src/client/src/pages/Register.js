import React, { useState } from 'react';

const Register = () => {
    const [formData, setFormData] = useState({
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

        // Check if passwords match
        if (formData.password !== formData.confirmPassword) {
            setMessage('Passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
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
        <>
            <div style={{ padding: '2rem' }}>
                <h2>Register</h2>
                {message && (
                    <div style={{ 
                        padding: '10px', 
                        marginBottom: '10px', 
                        backgroundColor: message.includes('successful') ? '#d4edda' : '#f8d7da',
                        border: `1px solid ${message.includes('successful') ? '#c3e6cb' : '#f5c6cb'}`,
                        borderRadius: '4px',
                        color: message.includes('successful') ? '#155724' : '#721c24'
                    }}>
                        {message}
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="username">Username:</label>
                        <input 
                            type="text" 
                            id="username" 
                            name="username" 
                            value={formData.username}
                            onChange={handleChange}
                            required 
                        />
                    </div>
                    <div>
                        <label htmlFor="password">Password:</label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password" 
                            value={formData.password}
                            onChange={handleChange}
                            required 
                        />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword">Confirm Password:</label>
                        <input 
                            type="password" 
                            id="confirmPassword" 
                            name="confirmPassword" 
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required 
                        />
                    </div>
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Registering...' : 'Register'}
                    </button>
                </form>
                <p>
                    Already have an account? <a href="/login">Login here</a>
                </p>
            </div>
        </>
    );
};

export default Register;