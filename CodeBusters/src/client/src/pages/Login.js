import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
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

        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                setMessage('Login successful! Redirecting...');
                // Use the login function from AuthContext
                login(data.user);
                
                // Redirect based on user role
                setTimeout(() => {
                    if (data.user.role === 'rider') {
                        navigate('/rider/dashboard');
                        //window.location.href = 'http://localhost:3000/home';
                    } else if (data.user.role === 'operator') {
                        navigate('/operator/dashboard');
                    } else {
                        navigate('/');
                    }
                }, 500);
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
        <div>
            <div>
                <p>Login</p>
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
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <p>
                    Don't have an account? <a href="/register">Register here</a>
                </p>
            </div>
        </div>
    );
};

export default Login;