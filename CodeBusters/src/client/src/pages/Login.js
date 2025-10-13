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
        <>
            <style>{`
                @keyframes slideUpBounce {
                    0% {
                        opacity: 0;
                        transform: translateY(50px) scale(0.9);
                    }
                    60% {
                        opacity: 0.8;
                        transform: translateY(-10px) scale(1.02);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                @keyframes floatUp {
                    0% {
                        transform: translateY(0px) scale(1);
                        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                    }
                    100% {
                        transform: translateY(-8px) scale(1.02);
                        box-shadow: 0 15px 35px rgba(0, 123, 255, 0.4);
                    }
                }
                
                @keyframes glowPulse {
                    0%, 100% {
                        box-shadow: 0 0 20px rgba(0, 123, 255, 0.3);
                    }
                    50% {
                        box-shadow: 0 0 30px rgba(0, 123, 255, 0.6);
                    }
                }
                
                .login-container {
                    animation: slideUpBounce 0.8s ease-out;
                }
                
                .login-input {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }
                
                .login-input:focus {
                    border-color: #007bff !important;
                    transform: translateY(-3px) scale(1.02) !important;
                    animation: glowPulse 2s infinite !important;
                }
                
                .login-input:hover {
                    transform: translateY(-1px) !important;
                    box-shadow: 0 5px 15px rgba(0, 123, 255, 0.2) !important;
                }
                
                .login-button {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }
                
                .login-button:hover:not(:disabled) {
                    animation: floatUp 0.3s ease-out forwards !important;
                    background-color: #0056b3 !important;
                }
                
                .login-button:active {
                    transform: translateY(-4px) scale(0.98) !important;
                    transition: all 0.1s ease-out !important;
                }
                
                .login-link {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .login-link:hover {
                    color: #0056b3 !important;
                    transform: translateY(-1px) !important;
                    text-shadow: 0 2px 4px rgba(0, 86, 179, 0.3) !important;
                    text-decoration: underline !important;
                }
                
                .login-title {
                    animation: slideUpBounce 1s ease-out 0.2s both;
                }
                
                .login-form {
                    animation: slideUpBounce 1s ease-out 0.4s both;
                }
                
                .login-footer {
                    animation: slideUpBounce 1s ease-out 0.6s both;
                }
            `}</style>
            
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #2c5aa0 0%, #1e3c72 100%)',
                backgroundImage: 'url(https://cdn.road.cc/sites/default/files/styles/main_width/public/images/%5Bparent-node-gallery-title%5D/Barclays%20Cycle%20Hire%20Scheme%20bikes%20on%20hire%20station%20%C2%A9%20Simon%20MacMichael.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
            }}>
                {/* Overlay for better text readability */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 1
                }}></div>
                
                <div className="login-container" style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    padding: '40px',
                    borderRadius: '15px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                    maxWidth: '400px',
                    width: '100%',
                    margin: '20px',
                    zIndex: 2,
                    position: 'relative'
                }}>
                <h2 className="login-title" style={{
                    textAlign: 'center',
                    marginBottom: '30px',
                    color: '#333',
                    fontSize: '2rem',
                    fontWeight: 'bold'
                }}>Welcome Back</h2>
                
                {message && (
                    <div style={{ 
                        padding: '12px', 
                        marginBottom: '20px', 
                        backgroundColor: message.includes('successful') ? '#d4edda' : '#f8d7da',
                        border: `1px solid ${message.includes('successful') ? '#c3e6cb' : '#f5c6cb'}`,
                        borderRadius: '8px',
                        color: message.includes('successful') ? '#155724' : '#721c24',
                        textAlign: 'center',
                        fontWeight: 'bold'
                    }}>
                        {message}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="login-form">
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="username" style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#555',
                            fontWeight: 'bold'
                        }}>Username:</label>
                        <input 
                            type="text" 
                            id="username" 
                            name="username" 
                            value={formData.username}
                            onChange={handleChange}
                            required
                            className="login-input"
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '2px solid #ddd',
                                borderRadius: '8px',
                                fontSize: '16px',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.3s ease'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#007bff'}
                            onBlur={(e) => e.target.style.borderColor = '#ddd'}
                        />
                    </div>
                    
                    <div style={{ marginBottom: '25px' }}>
                        <label htmlFor="password" style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#555',
                            fontWeight: 'bold'
                        }}>Password:</label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password" 
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="login-input"
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '2px solid #ddd',
                                borderRadius: '8px',
                                fontSize: '16px',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.3s ease'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#007bff'}
                            onBlur={(e) => e.target.style.borderColor = '#ddd'}
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="login-button"
                        style={{
                            width: '100%',
                            padding: '14px',
                            backgroundColor: isLoading ? '#6c757d' : '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.3s ease',
                            marginBottom: '20px'
                        }}
                        onMouseOver={(e) => !isLoading && (e.target.style.backgroundColor = '#0056b3')}
                        onMouseOut={(e) => !isLoading && (e.target.style.backgroundColor = '#007bff')}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                
                <p className="login-footer" style={{
                    textAlign: 'center',
                    color: '#666',
                    margin: 0
                }}>
                    Don't have an account? <a 
                        href="/register" 
                        className="login-link"
                        style={{
                            color: '#007bff',
                            textDecoration: 'none',
                            fontWeight: 'bold'
                        }}
                        onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                    >Register here</a>
                </p>
            </div>
        </div>
        </>
    );
};

export default Login;