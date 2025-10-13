import React, { useState } from 'react';

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

    const containerStyle = {
        minHeight: '100vh',
        backgroundImage: 'url("https://thumbs.dreamstime.com/z/reykjavik-iceland-september-row-bicycles-docking-station-wow-air-public-bike-sharing-system-streets-city-citybike-253379820.jpg?ct=jpeg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        position: 'relative',
        filter: 'blur(0px)'
    };

    const overlayStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 1
    };

    const formContainerStyle = {
        position: 'relative',
        zIndex: 2,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        maxWidth: '450px',
        width: '100%',
        animation: 'slideUp 0.6s ease-out'
    };

    const titleStyle = {
        textAlign: 'center',
        marginBottom: '30px',
        fontSize: '2.2rem',
        fontWeight: '700',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
    };

    const subtitleStyle = {
        textAlign: 'center',
        marginBottom: '25px',
        color: '#666',
        fontSize: '1rem',
        fontWeight: '400'
    };

    const inputGroupStyle = {
        marginBottom: '20px'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600',
        color: '#333',
        fontSize: '0.95rem'
    };

    const inputStyle = {
        width: '100%',
        padding: '15px 20px',
        border: '2px solid rgba(102, 126, 234, 0.2)',
        borderRadius: '12px',
        fontSize: '1rem',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        transition: 'all 0.3s ease',
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box'
    };

    const inputFocusStyle = {
        borderColor: '#667eea',
        boxShadow: '0 0 20px rgba(102, 126, 234, 0.3)',
        transform: 'translateY(-2px)'
    };

    const buttonStyle = {
        width: '100%',
        padding: '16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '1.1rem',
        fontWeight: '600',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        marginTop: '10px',
        opacity: isLoading ? 0.8 : 1,
        transform: isLoading ? 'scale(0.98)' : 'scale(1)'
    };

    const buttonHoverStyle = {
        transform: 'translateY(-2px)',
        boxShadow: '0 10px 25px rgba(102, 126, 234, 0.4)'
    };

    const linkStyle = {
        textAlign: 'center',
        marginTop: '25px',
        color: '#666',
        fontSize: '0.95rem'
    };

    const linkAnchorStyle = {
        color: '#667eea',
        textDecoration: 'none',
        fontWeight: '600',
        transition: 'color 0.3s ease'
    };

    const messageStyle = {
        padding: '15px 20px',
        marginBottom: '20px',
        borderRadius: '12px',
        fontSize: '0.95rem',
        fontWeight: '500',
        textAlign: 'center',
        backgroundColor: message.includes('successful') ? 'rgba(40, 167, 69, 0.15)' : 'rgba(220, 53, 69, 0.15)',
        border: `2px solid ${message.includes('successful') ? 'rgba(40, 167, 69, 0.3)' : 'rgba(220, 53, 69, 0.3)'}`,
        color: message.includes('successful') ? '#28a745' : '#dc3545'
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
                        box-shadow: 0 15px 35px rgba(102, 126, 234, 0.4);
                    }
                }
                
                @keyframes glowPulse {
                    0%, 100% {
                        box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
                    }
                    50% {
                        box-shadow: 0 0 30px rgba(102, 126, 234, 0.6);
                    }
                }
                
                .register-container {
                    animation: slideUpBounce 0.8s ease-out;
                }
                
                .register-input {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .register-input:focus {
                    border-color: #667eea !important;
                    transform: translateY(-3px) scale(1.02) !important;
                    animation: glowPulse 2s infinite !important;
                }
                
                .register-input:hover {
                    transform: translateY(-1px) !important;
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2) !important;
                }
                
                .register-button {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .register-button:hover:not(:disabled) {
                    animation: floatUp 0.3s ease-out forwards !important;
                }
                
                .register-button:active {
                    transform: translateY(-4px) scale(0.98) !important;
                    transition: all 0.1s ease-out !important;
                }
                
                .register-link {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .register-link:hover {
                    color: #764ba2 !important;
                    transform: translateY(-1px) !important;
                    text-shadow: 0 2px 4px rgba(118, 75, 162, 0.3) !important;
                }
                
                .register-title {
                    animation: slideUpBounce 1s ease-out 0.2s both;
                }
                
                .register-subtitle {
                    animation: slideUpBounce 1s ease-out 0.4s both;
                }
                
                .register-form {
                    animation: slideUpBounce 1s ease-out 0.6s both;
                }
            `}</style>
            
            <div style={containerStyle}>
                <div style={overlayStyle}></div>
                <div style={formContainerStyle} className="register-container">
                    <h2 style={titleStyle} className="register-title">Join CodeBusters</h2>
                    <p style={subtitleStyle} className="register-subtitle">Create your account to start your bike sharing journey</p>
                    
                    {message && (
                        <div style={messageStyle}>
                            {message}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="register-form">
                        <div style={inputGroupStyle}>
                            <label htmlFor="firstName" style={labelStyle}>First Name</label>
                            <input 
                                type="text" 
                                id="firstName" 
                                name="firstName" 
                                value={formData.firstName}
                                onChange={handleChange}
                                required 
                                style={inputStyle}
                                className="register-input"
                                placeholder="Enter your first name"
                            />
                        </div>

                        <div style={inputGroupStyle}>
                            <label htmlFor="lastName" style={labelStyle}>Last Name</label>
                            <input 
                                type="text" 
                                id="lastName" 
                                name="lastName" 
                                value={formData.lastName}
                                onChange={handleChange}
                                required 
                                style={inputStyle}
                                className="register-input"
                                placeholder="Enter your last name"
                            />
                        </div>

                        <div style={inputGroupStyle}>
                            <label htmlFor="email" style={labelStyle}>Email Address</label>
                            <input 
                                type="email" 
                                id="email" 
                                name="email" 
                                value={formData.email}
                                onChange={handleChange}
                                required 
                                style={inputStyle}
                                className="register-input"
                                placeholder="Enter your email address"
                            />
                        </div>

                        <div style={inputGroupStyle}>
                            <label htmlFor="address" style={labelStyle}>Address</label>
                            <input 
                                type="text" 
                                id="address" 
                                name="address" 
                                value={formData.address}
                                onChange={handleChange}
                                style={inputStyle}
                                className="register-input"
                                placeholder="Enter your address (optional)"
                            />
                        </div>

                        <div style={inputGroupStyle}>
                            <label htmlFor="username" style={labelStyle}>Username</label>
                            <input 
                                type="text" 
                                id="username" 
                                name="username" 
                                value={formData.username}
                                onChange={handleChange}
                                required 
                                style={inputStyle}
                                className="register-input"
                                placeholder="Enter your username"
                            />
                        </div>
                        
                        <div style={inputGroupStyle}>
                            <label htmlFor="password" style={labelStyle}>Password</label>
                            <input 
                                type="password" 
                                id="password" 
                                name="password" 
                                value={formData.password}
                                onChange={handleChange}
                                required 
                                style={inputStyle}
                                className="register-input"
                                placeholder="Enter your password"
                            />
                        </div>
                        
                        <div style={inputGroupStyle}>
                            <label htmlFor="confirmPassword" style={labelStyle}>Confirm Password</label>
                            <input 
                                type="password" 
                                id="confirmPassword" 
                                name="confirmPassword" 
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required 
                                style={inputStyle}
                                className="register-input"
                                placeholder="Confirm your password"
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            style={buttonStyle}
                            className="register-button"
                        >
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>
                    
                    <div style={linkStyle}>
                        Already have an account? <a href="/login" style={linkAnchorStyle} className="register-link">Sign in here</a>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Register;