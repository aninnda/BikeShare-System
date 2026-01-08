import React, { useState } from 'react';
import API_URL from '../config';
import './style/Register.css';

const Register = () => {
    const [currentStep, setCurrentStep] = useState(1); // 1: Basic Info, 2: Card Info
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        address: '',
        username: '',
        password: '',
        confirmPassword: '',
        cardNumber: '',
        expiryDate: '',
        cvcCode: '',
        cardHolderName: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleChange = (e) => {
        let value = e.target.value;
        const name = e.target.name;

        // Format card number (add spaces every 4 digits)
        if (name === 'cardNumber') {
            value = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
            if (value.replace(/\s/g, '').length > 16) {
                return;
            }
        }

        // Format expiry date (MM/YY)
        if (name === 'expiryDate') {
            value = value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            if (value.length > 5) {
                return;
            }
        }

        // Format CVC (only numbers, max 3 digits)
        if (name === 'cvcCode') {
            value = value.replace(/\D/g, '');
            if (value.length > 3) {
                return;
            }
        }

        setFormData({
            ...formData,
            [name]: value
        });
    };

    const validateBasicInfo = () => {
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.username || !formData.password) {
            setMessage('Please fill in all required fields');
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setMessage('Passwords do not match');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setMessage('Please enter a valid email address');
            return false;
        }

        return true;
    };

    const validateCardInfo = () => {
        if (!formData.cardNumber || !formData.expiryDate || !formData.cvcCode || !formData.cardHolderName) {
            setMessage('Please fill in all card information');
            return false;
        }

        const cardNumberOnly = formData.cardNumber.replace(/\s/g, '');
        if (cardNumberOnly.length !== 16) {
            setMessage('Card number must be 16 digits');
            return false;
        }

        const expiryPattern = /^(0[1-9]|1[0-2])\/\d{2}$/;
        if (!expiryPattern.test(formData.expiryDate)) {
            setMessage('Please enter a valid expiry date (MM/YY)');
            return false;
        }

        if (formData.cvcCode.length !== 3) {
            setMessage('CVC code must be 3 digits');
            return false;
        }

        if (formData.cardHolderName.trim().length < 2) {
            setMessage('Please enter the cardholder name');
            return false;
        }

        return true;
    };

    const handleNextStep = () => {
        setMessage('');
        
        if (currentStep === 1) {
            if (validateBasicInfo()) {
                setCurrentStep(2);
            }
        }
    };

    const handlePrevStep = () => {
        setMessage('');
        setCurrentStep(1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        // Validate card information
        if (!validateCardInfo()) {
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/register`, {
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
                    password: formData.password,
                    cardNumber: formData.cardNumber.replace(/\s/g, ''),
                    expiryDate: formData.expiryDate,
                    cvcCode: formData.cvcCode,
                    cardHolderName: formData.cardHolderName
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
                
                {/* Step Indicator */}
                <div className="register-steps">
                    <div className={`register-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                        <div className="register-step-number">1</div>
                        <div className="register-step-label">Basic Info</div>
                    </div>
                    <div className="register-step-divider"></div>
                    <div className={`register-step ${currentStep >= 2 ? 'active' : ''}`}>
                        <div className="register-step-number">2</div>
                        <div className="register-step-label">Card Info</div>
                    </div>
                </div>
                
                {message && (
                    <div className={`register-message ${message.includes('successful') ? 'success' : 'error'}`}>
                        {message}
                    </div>
                )}
                
                <form onSubmit={currentStep === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNextStep(); }} className="register-form">
                    {/* Step 1: Basic Information */}
                    {currentStep === 1 && (
                        <>
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
                                className="register-button"
                            >
                                Next: Card Information
                            </button>
                        </>
                    )}

                    {/* Step 2: Card Information */}
                    {currentStep === 2 && (
                        <>
                            <div className="register-input-group">
                                <label htmlFor="cardNumber" className="register-label">Card Number</label>
                                <input
                                    type="text"
                                    id="cardNumber"
                                    name="cardNumber"
                                    value={formData.cardNumber}
                                    onChange={handleChange}
                                    className="register-input"
                                    placeholder="1234 5678 9012 3456"
                                    maxLength="19"
                                    required
                                />
                            </div>

                            <div className="register-row">
                                <div className="register-input-group register-half-width">
                                    <label htmlFor="expiryDate" className="register-label">Expiry Date</label>
                                    <input
                                        type="text"
                                        id="expiryDate"
                                        name="expiryDate"
                                        value={formData.expiryDate}
                                        onChange={handleChange}
                                        className="register-input"
                                        placeholder="MM/YY"
                                        maxLength="5"
                                        required
                                    />
                                </div>

                                <div className="register-input-group register-half-width">
                                    <label htmlFor="cvcCode" className="register-label">CVC Code</label>
                                    <input
                                        type="text"
                                        id="cvcCode"
                                        name="cvcCode"
                                        value={formData.cvcCode}
                                        onChange={handleChange}
                                        className="register-input"
                                        placeholder="123"
                                        maxLength="3"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="register-input-group">
                                <label htmlFor="cardHolderName" className="register-label">Cardholder Name</label>
                                <input
                                    type="text"
                                    id="cardHolderName"
                                    name="cardHolderName"
                                    value={formData.cardHolderName}
                                    onChange={handleChange}
                                    className="register-input"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div className="register-security-notice">
                                🔒 Your payment information is secure and encrypted. This is a demo - no actual charges will be made.
                            </div>

                            <div className="register-button-group">
                                <button
                                    type="button"
                                    onClick={handlePrevStep}
                                    disabled={isLoading}
                                    className="register-button register-button-secondary"
                                >
                                    Back
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="register-button"
                                >
                                    {isLoading ? 'Creating Account...' : 'Create Account'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
                
                <div className="register-footer">
                    Already have an account? <a href="/login" className="register-link">Sign in here</a>
                </div>
            </div>
        </div>
    );
};

export default Register;