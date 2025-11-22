import React, { useState, useEffect } from 'react';
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
    const [savedCard, setSavedCard] = useState(null);
    const [useNewCard, setUseNewCard] = useState(false);
    
    useEffect(() => {
        // Fetch saved payment method when component mounts
        const fetchPaymentMethod = async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            console.log('Payment component - user from localStorage:', user);
            
            if (!user || !user.id) {
                console.log('No user or user.id found in localStorage');
                return;
            }
            
            try {
                const url = `http://localhost:5001/api/payment-methods/${user.id}`;
                console.log('Fetching payment method from:', url);
                
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                console.log('Response status:', response.status);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Payment method data:', data);
                    
                    if (data.success && data.paymentMethod) {
                        console.log('Setting saved card:', data.paymentMethod);
                        setSavedCard(data.paymentMethod);
                    } else {
                        console.log('No payment method found in response');
                    }
                } else {
                    console.error('Response not OK:', response.status);
                }
            } catch (error) {
                console.error('Error fetching payment method:', error);
            }
        };
        
        fetchPaymentMethod();
    }, []);

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
        if (e) e.preventDefault();
        setMessage('');

        // Only validate if using new card (not saved card)
        if (!savedCard || useNewCard) {
            const validationError = validateForm();
            if (validationError) {
                setMessage(validationError);
                return;
            }
        }

        setIsLoading(true);

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            
            // If this is a batch payment (multiple rentals), pay them all
            if (selectedPlan?.isBatchPayment && selectedPlan?.rentalIds?.length > 0) {
                const rentalIds = selectedPlan.rentalIds;
                let successCount = 0;
                let failCount = 0;
                
                for (const rentalId of rentalIds) {
                    try {
                        const response = await fetch('http://localhost:5001/api/payments/charge', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-user-id': String(user.id),
                                'x-user-role': String(user.role || 'rider'),
                                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                            },
                            body: JSON.stringify({
                                rentalId: rentalId,
                                method: 'card'
                            })
                        });

                        const data = await response.json();
                        if (data.success) {
                            successCount++;
                        } else {
                            failCount++;
                        }
                    } catch (error) {
                        console.error(`Error paying rental ${rentalId}:`, error);
                        failCount++;
                    }
                }
                
                if (successCount > 0 && failCount === 0) {
                    setMessage(`Payment successful! All ${successCount} rental(s) paid.`);
                } else if (successCount > 0) {
                    setMessage(`Partially successful: ${successCount} paid, ${failCount} failed.`);
                } else {
                    setMessage('Payment failed. Please try again.');
                }
                
                setTimeout(() => {
                    navigate('/profile');
                }, 2000);
            }
            // If this is a single rental payment (has rentalId), call the payment API
            else if (selectedPlan?.rentalId) {
                const response = await fetch('http://localhost:5001/api/payments/charge', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': String(user.id),
                        'x-user-role': String(user.role || 'rider'),
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                    },
                    body: JSON.stringify({
                        rentalId: selectedPlan.rentalId,
                        method: 'card'
                    })
                });

                const data = await response.json();

                if (data.success) {
                    setMessage(data.message || 'Payment successful!');
                    setTimeout(() => {
                        navigate('/profile');
                    }, 2000);
                } else {
                    setMessage(data.message || 'Payment failed. Please try again.');
                    setIsLoading(false);
                }
            } else {
                // For subscription/plan payments (not rental-specific)
                await new Promise(resolve => setTimeout(resolve, 2000));
                setMessage('Payment successful! Your subscription has been activated.');
                
                setTimeout(() => {
                    navigate('/rider/dashboard');
                }, 2000);
            }
            
        } catch (error) {
            console.error('Payment error:', error);
            setMessage('Payment failed. Please try again.');
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

                {/* Show saved card or new card form */}
                {savedCard && !useNewCard ? (
                    <div className="saved-card-section">
                        <h3 className="payment-method-title">Saved Payment Method</h3>
                        <div className="saved-card-display">
                            <div className="card-icon"></div>
                            <div className="card-details">
                                <div className="card-number">•••• •••• •••• {savedCard.card_number_last4}</div>
                                <div className="card-holder">{savedCard.card_holder_name}</div>
                                <div className="card-expiry">Expires: {savedCard.expiry_date}</div>
                            </div>
                        </div>
                        
                        <button
                            type="button"
                            onClick={() => setUseNewCard(true)}
                            className="payment-button payment-button-link"
                        >
                            Use a different card
                        </button>
                        
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
                                type="button"
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="payment-button payment-button-primary"
                            >
                                {isLoading ? 'Processing Payment...' : `Confirm & Pay ${selectedPlan?.price}`}
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {savedCard && useNewCard && (
                            <button
                                type="button"
                                onClick={() => setUseNewCard(false)}
                                className="payment-button payment-button-link"
                                style={{ marginBottom: '15px' }}
                            >
                                ← Use saved card
                            </button>
                        )}
                        
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
                )}

                <div className="payment-security-notice">
                    Your payment information is secure and encrypted. This is a demo - no actual charges will be made.
                </div>
            </div>
        </div>
    );
};

export default Payment;