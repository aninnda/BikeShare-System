import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Payment = ({ selectedPlan, onBack }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
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
                return; // Don't allow more than 16 digits
            }
        }

        // Format expiry date (MM/YY)
        if (name === 'expiryDate') {
            value = value.replace(/\D/g, ''); // Remove non-digits
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            if (value.length > 5) {
                return; // Don't allow more than MM/YY
            }
        }

        // Format CVC (only numbers, max 3 digits)
        if (name === 'cvcCode') {
            value = value.replace(/\D/g, ''); // Remove non-digits
            if (value.length > 3) {
                return; // Don't allow more than 3 digits
            }
        }

        setFormData({
            ...formData,
            [name]: value
        });
    };

    const validateForm = () => {
        if (!formData.cardNumber || !formData.expiryDate || !formData.cvcCode || !formData.cardHolderName) {
            return 'Please fill in all payment information';
        }

        // Validate card number (remove spaces and check length)
        const cardNumberOnly = formData.cardNumber.replace(/\s/g, '');
        if (cardNumberOnly.length !== 16) {
            return 'Card number must be 16 digits';
        }

        // Validate expiry date format
        const expiryPattern = /^(0[1-9]|1[0-2])\/\d{2}$/;
        if (!expiryPattern.test(formData.expiryDate)) {
            return 'Please enter a valid expiry date (MM/YY)';
        }

        // Validate CVC
        if (formData.cvcCode.length !== 3) {
            return 'CVC code must be 3 digits';
        }

        // Validate cardholder name
        if (formData.cardHolderName.trim().length < 2) {
            return 'Please enter the cardholder name';
        }

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const validationError = validateForm();
        if (validationError) {
            setMessage(validationError);
            return;
        }

        setIsLoading(true);

        try {
            // Simulate payment processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // In a real application, you would:
            // 1. Send encrypted payment data to your payment processor
            // 2. Store the subscription in your database
            // 3. Update the user's subscription status

            setMessage('Payment successful! Your subscription has been activated.');
            
            setTimeout(() => {
                navigate('/rider/dashboard');
            }, 2000);
            
        } catch (error) {
            setMessage('Payment failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Styles
    const containerStyle = {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif"
    };

    const paymentCardStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        width: '100%',
        maxWidth: '500px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
    };

    const titleStyle = {
        textAlign: 'center',
        marginBottom: '30px',
        fontSize: '2.5rem',
        fontWeight: '700',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    };

    const planSummaryStyle = {
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '30px',
        border: '1px solid #e0e0e0'
    };

    const fieldGroupStyle = {
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

    const buttonGroupStyle = {
        display: 'flex',
        gap: '15px',
        marginTop: '30px'
    };

    const buttonStyle = {
        flex: '1',
        padding: '15px 25px',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        border: 'none',
        opacity: isLoading ? 0.7 : 1
    };

    const primaryButtonStyle = {
        ...buttonStyle,
        background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
        color: 'white'
    };

    const secondaryButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#6c757d',
        color: 'white'
    };

    const messageStyle = {
        padding: '12px 20px',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center',
        fontWeight: '500',
        backgroundColor: message.includes('successful') ? '#d4edda' : '#f8d7da',
        color: message.includes('successful') ? '#155724' : '#721c24',
        border: `1px solid ${message.includes('successful') ? '#c3e6cb' : '#f5c6cb'}`
    };

    const rowStyle = {
        display: 'flex',
        gap: '15px'
    };

    const halfWidthStyle = {
        flex: '1'
    };

    return (
        <div style={containerStyle}>
            <div style={paymentCardStyle}>
                <h2 style={titleStyle}>Complete Payment</h2>
                
                {/* Plan Summary */}
                <div style={planSummaryStyle}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Selected Plan</h3>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#667eea' }}>
                        {selectedPlan?.title}
                    </div>
                    <div style={{ fontSize: '1rem', color: '#666', marginTop: '5px' }}>
                        {selectedPlan?.price} {selectedPlan?.duration}
                    </div>
                </div>

                {message && (
                    <div style={messageStyle}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={fieldGroupStyle}>
                        <label htmlFor="cardNumber" style={labelStyle}>Card Number</label>
                        <input
                            type="text"
                            id="cardNumber"
                            name="cardNumber"
                            value={formData.cardNumber}
                            onChange={handleChange}
                            style={inputStyle}
                            placeholder="1234 5678 9012 3456"
                            maxLength="19"
                        />
                    </div>

                    <div style={rowStyle}>
                        <div style={halfWidthStyle}>
                            <label htmlFor="expiryDate" style={labelStyle}>Expiry Date</label>
                            <input
                                type="text"
                                id="expiryDate"
                                name="expiryDate"
                                value={formData.expiryDate}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="MM/YY"
                                maxLength="5"
                            />
                        </div>

                        <div style={halfWidthStyle}>
                            <label htmlFor="cvcCode" style={labelStyle}>CVC Code</label>
                            <input
                                type="text"
                                id="cvcCode"
                                name="cvcCode"
                                value={formData.cvcCode}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="123"
                                maxLength="3"
                            />
                        </div>
                    </div>

                    <div style={fieldGroupStyle}>
                        <label htmlFor="cardHolderName" style={labelStyle}>Cardholder Name</label>
                        <input
                            type="text"
                            id="cardHolderName"
                            name="cardHolderName"
                            value={formData.cardHolderName}
                            onChange={handleChange}
                            style={inputStyle}
                            placeholder="John Doe"
                        />
                    </div>

                    <div style={buttonGroupStyle}>
                        <button
                            type="button"
                            onClick={onBack}
                            disabled={isLoading}
                            style={secondaryButtonStyle}
                        >
                            Back to Plans
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={primaryButtonStyle}
                        >
                            {isLoading ? 'Processing Payment...' : `Pay ${selectedPlan?.price}`}
                        </button>
                    </div>
                </form>

                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: '#e8f4fd',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    color: '#0c5460'
                }}>
                    🔒 Your payment information is secure and encrypted. This is a demo - no actual charges will be made.
                </div>
            </div>
        </div>
    );
};

export default Payment;