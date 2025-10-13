import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Payment from '../components/Payment';

// Plan Card Component with hover effects (similar to Home page FeatureCard)
const PlanCard = ({ title, price, duration, description, features, color, glowColor, isPopular = false, onChoosePlan }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div 
            style={{
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                padding: '30px',
                borderRadius: '15px',
                textAlign: 'center',
                boxShadow: isHovered 
                    ? `0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px ${glowColor}` 
                    : '0 8px 25px rgba(0, 0, 0, 0.3)',
                border: isHovered 
                    ? `2px solid ${glowColor}` 
                    : isPopular 
                        ? `2px solid ${color}`
                        : '1px solid rgba(255, 255, 255, 0.1)',
                transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
                transition: 'all 0.4s ease',
                cursor: 'pointer',
                position: 'relative',
                minHeight: '400px'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isPopular && (
                <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: color,
                    color: 'white',
                    padding: '5px 20px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                }}>
                    MOST POPULAR
                </div>
            )}
            
            <h3 style={{
                fontSize: '1.8rem',
                fontWeight: 'bold',
                marginBottom: '15px',
                color: color
            }}>{title}</h3>
            
            <div style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                color: '#fff',
                marginBottom: '10px'
            }}>
                {price}
            </div>
            
            <div style={{
                fontSize: '1rem',
                color: '#aaa',
                marginBottom: '20px'
            }}>
                {duration}
            </div>
            
            <p style={{
                fontSize: '1rem',
                opacity: '0.9',
                lineHeight: '1.5',
                marginBottom: '20px'
            }}>{description}</p>
            
            <div style={{
                textAlign: 'left',
                marginBottom: '30px'
            }}>
                {features.map((feature, index) => (
                    <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '8px',
                        fontSize: '0.95rem'
                    }}>
                        <span style={{ 
                            color: color, 
                            marginRight: '8px',
                            fontWeight: 'bold' 
                        }}>✓</span>
                        {feature}
                    </div>
                ))}
            </div>
            
            <button 
                onClick={() => onChoosePlan(title)}
                style={{
                    width: '100%',
                    padding: '15px',
                    backgroundColor: isHovered ? color : 'transparent',
                    color: isHovered ? '#fff' : color,
                    border: `2px solid ${color}`,
                    borderRadius: '8px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                }}
            >
                Choose Plan
            </button>
        </div>
    );
};

const Plans = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showPayment, setShowPayment] = useState(false);
    
    const handleChoosePlan = (planTitle) => {
        // Check if user is logged in
        if (!user) {
            navigate('/login');
            return;
        }
        
        // Find the selected plan
        const plan = plans.find(p => p.title === planTitle);
        setSelectedPlan(plan);
        setShowPayment(true);
    };

    const handleBackToPlans = () => {
        setShowPayment(false);
        setSelectedPlan(null);
    };
    
    const plans = [
        {
            title: "Basic Rider",
            price: "$9.99",
            duration: "per month",
            description: "Perfect for occasional rides around the city. Great for students and casual cyclists.",
            features: [
                "30 minutes free per ride",
                "Additional $0.15 per minute",
                "Access to standard bikes",
                "Mobile app access",
                "24/7 customer support"
            ],
            color: "#4a90e2",
            glowColor: "rgba(74, 144, 226, 0.4)"
        },
        {
            title: "Pro Rider",
            price: "$19.99",
            duration: "per month",
            description: "Ideal for daily commuters who need reliable transportation throughout the city.",
            features: [
                "60 minutes free per ride",
                "Additional $0.10 per minute", 
                "Access to standard & e-bikes",
                "Priority bike availability",
                "Mobile app access",
                "24/7 customer support",
                "Monthly usage analytics"
            ],
            color: "#f39c12",
            glowColor: "rgba(243, 156, 18, 0.4)",
            isPopular: true
        },
        {
            title: "Premium Rider",
            price: "$34.99",
            duration: "per month",
            description: "Ultimate freedom for bike enthusiasts who want unlimited access and premium features.",
            features: [
                "Unlimited free rides (up to 2hrs)",
                "Additional $0.05 per minute",
                "Access to all bike types",
                "Priority customer support",
                "Premium mobile features",
                "Bike reservation (up to 30min)",
                "Monthly analytics & insights",
                "Carbon footprint tracking"
            ],
            color: "#e74c3c",
            glowColor: "rgba(231, 76, 60, 0.4)"
        }
    ];

    // Show payment form if a plan is selected
    if (showPayment && selectedPlan) {
        return <Payment selectedPlan={selectedPlan} onBack={handleBackToPlans} />;
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #2c3e50 100%)',
            backgroundImage: 'url(https://cdn01.bcycle.com/libraries/images/default-source/default-library/ths00321-(2).jpg?sfvrsn=ab112cc5_0)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            position: 'relative',
            color: 'white',
            padding: '40px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            {/* Dark overlay for better text readability */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                zIndex: 1
            }}></div>
            
            <div style={{
                position: 'relative',
                zIndex: 2,
                maxWidth: '1200px',
                width: '100%',
                textAlign: 'center'
            }}>
                <h1 style={{
                    fontSize: '3.5rem',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    background: 'linear-gradient(45deg, #4a90e2, #f39c12, #e74c3c)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                }}>
                    Choose Your Perfect Plan
                </h1>
                
                <p style={{
                    fontSize: '1.3rem',
                    marginBottom: '50px',
                    color: '#ecf0f1',
                    maxWidth: '800px',
                    margin: '0 auto 50px auto',
                    lineHeight: '1.6'
                }}>
                    Select the bike sharing plan that fits your lifestyle. Whether you're a casual rider or daily commuter, 
                    we have the perfect solution for your urban mobility needs.
                </p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '30px',
                    marginBottom: '50px'
                }}>
                    {plans.map((plan, index) => (
                        <PlanCard
                            key={index}
                            title={plan.title}
                            price={plan.price}
                            duration={plan.duration}
                            description={plan.description}
                            features={plan.features}
                            color={plan.color}
                            glowColor={plan.glowColor}
                            isPopular={plan.isPopular}
                            onChoosePlan={handleChoosePlan}
                        />
                    ))}
                </div>

                <div style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    padding: '30px',
                    borderRadius: '15px',
                    maxWidth: '900px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    margin: '0 auto'
                }}>
                    <h3 style={{
                        fontSize: '1.8rem',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        color: '#4a90e2'
                    }}>
                        Why Choose CodeBusters BikeShare?
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '20px',
                        textAlign: 'left'
                    }}>
                        <div>
                            <h4 style={{ color: '#f39c12', marginBottom: '10px' }}>🌍 Eco-Friendly</h4>
                            <p style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                                Reduce your carbon footprint with our sustainable transportation solution.
                            </p>
                        </div>
                        <div>
                            <h4 style={{ color: '#e74c3c', marginBottom: '10px' }}>💰 Cost-Effective</h4>
                            <p style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                                Save money compared to traditional transportation methods.
                            </p>
                        </div>
                        <div>
                            <h4 style={{ color: '#4a90e2', marginBottom: '10px' }}>🏃‍♀️ Stay Healthy</h4>
                            <p style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                                Incorporate exercise into your daily routine with every ride.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Plans;