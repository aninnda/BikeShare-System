import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './style/Payment.css';

const Payment = ({ selectedPlan, onBack }) => {
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

    return (
        <div className="payment-container">
            <div className="payment-card">
                <h2 className="payment-title">Complete Payment</h2>
                
                {/* Plan Summary */}
                <div className="payment-plan-summary">
                    <h3>Selected Plan</h3>
                    <div className="payment-plan-title">
                        {selectedPlan?.title}
                    </div>
                    <div className="payment-plan-price">
                        {selectedPlan?.price} {selectedPlan?.duration}
                    </div>
                </div>

                {message && (
                    <div className={`payment-message ${message.includes('successful') ? 'success' : 'error'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="payment-field-group">
                        <label htmlFor="cardNumber" className="payment-label">Card Number</label>
                        <input
                            type="text"
                            id="cardNumber"
                            name="cardNumber"
                            value={formData.cardNumber}
                            onChange={handleChange}
                            className="payment-input"
                            placeholder="1234 5678 9012 3456"
                            maxLength="19"
                        />
                    </div>

                    <div className="payment-row">
                        <div className="payment-half-width">
                            <label htmlFor="expiryDate" className="payment-label">Expiry Date</label>
                            <input
                                type="text"
                                id="expiryDate"
                                name="expiryDate"
                                value={formData.expiryDate}
                                onChange={handleChange}
                                className="payment-input"
                                placeholder="MM/YY"
                                maxLength="5"
                            />
                        </div>

                        <div className="payment-half-width">
                            <label htmlFor="cvcCode" className="payment-label">CVC Code</label>
                            <input
                                type="text"
                                id="cvcCode"
                                name="cvcCode"
                                value={formData.cvcCode}
                                onChange={handleChange}
                                className="payment-input"
                                placeholder="123"
                                maxLength="3"
                            />
                        </div>
                    </div>

                    <div className="payment-field-group">
                        <label htmlFor="cardHolderName" className="payment-label">Cardholder Name</label>
                        <input
                            type="text"
                            id="cardHolderName"
                            name="cardHolderName"
                            value={formData.cardHolderName}
                            onChange={handleChange}
                            className="payment-input"
                            placeholder="John Doe"
                        />
                    </div>

                    <div className="payment-button-group">
                        <button
                            type="button"
                            onClick={onBack}
                            disabled={isLoading}
                            className="payment-button payment-button-secondary"
                        >
                            Back to Plans
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="payment-button payment-button-primary"
                        >
                            {isLoading ? 'Processing Payment...' : `Pay ${selectedPlan?.price}`}
                        </button>
                    </div>
                </form>

                <div className="payment-security-notice">
                    Your payment information is secure and encrypted. This is a demo - no actual charges will be made.
                </div>
            </div>
        </div>
    );
};

export default Payment;