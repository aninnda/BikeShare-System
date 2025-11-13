import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Payment from '../components/Payment';
import './style/Plans.css';

// Plan Card Component with hover effects (similar to Home page FeatureCard)
const PlanCard = ({ title, price, duration, description, features, colorClass, isPopular = false, onChoosePlan }) => {
    return (
        <div 
            className={`plan-card ${colorClass} ${isPopular ? 'popular' : ''}`}
        >
            {isPopular && (
                <div className="plan-card-popular-badge">
                    MOST POPULAR
                </div>
            )}
            
            <h3 className={`plan-card-title ${colorClass}`}>{title}</h3>
            
            <div className="plan-card-price">
                {price}
            </div>
            
            <div className="plan-card-duration">
                {duration}
            </div>
            
            <p className="plan-card-description">{description}</p>
            
            <div className="plan-card-features">
                {features.map((feature, index) => (
                    <div key={index} className="plan-card-feature">
                        <span className={`plan-card-feature-check ${colorClass}`}>✓</span>
                        {feature}
                    </div>
                ))}
            </div>
            
            <button 
                onClick={() => onChoosePlan(title)}
                className={`plan-card-button ${colorClass}`}
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
            colorClass: "blue"
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
            colorClass: "orange",
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
            colorClass: "red"
        }
    ];

    // Show payment form if a plan is selected
    if (showPayment && selectedPlan) {
        return <Payment selectedPlan={selectedPlan} onBack={handleBackToPlans} />;
    }

    return (
        <div className="plans-page">
            <div className="plans-overlay"></div>
            
            <div className="plans-container">
                <h1 className="plans-title">
                    Choose Your Perfect Plan
                </h1>
                
                <p className="plans-subtitle">
                    Select the bike sharing plan that fits your lifestyle. Whether you're a casual rider or daily commuter, 
                    we have the perfect solution for your urban mobility needs.
                </p>

                <div className="plans-pricing-section">
                    <h2 className="plans-pricing-title">Current Rental Pricing</h2>
                    <div className="plans-pricing-cards">
                        <div className="plans-pricing-card">
                            <div className="plans-pricing-icon">Standard</div>
                            <div className="plans-pricing-rate standard">10¢ <span className="plans-pricing-rate-unit">/ min</span></div>
                            <p className="plans-pricing-description">Reliable manual bike for short city trips — most affordable option.</p>
                        </div>

                        <div className="plans-pricing-card">
                            <div className="plans-pricing-icon">E-Bike</div>
                            <div className="plans-pricing-rate ebike">25¢ <span className="plans-pricing-rate-unit">/ min</span></div>
                            <p className="plans-pricing-description">Electric assist for easier commutes and hills. Premium ride experience.</p>
                        </div>
                    </div>
                </div>

                <div className="plans-grid">
                    {plans.map((plan, index) => (
                        <PlanCard
                            key={index}
                            title={plan.title}
                            price={plan.price}
                            duration={plan.duration}
                            description={plan.description}
                            features={plan.features}
                            colorClass={plan.colorClass}
                            isPopular={plan.isPopular}
                            onChoosePlan={handleChoosePlan}
                        />
                    ))}
                </div>

                <div className="plans-benefits">
                    <h3 className="plans-benefits-title">
                        Why Choose CodeBusters BikeShare?
                    </h3>
                    <div className="plans-benefits-grid">
                        <div>
                            <h4 className="plans-benefit-title eco">Eco-Friendly</h4>
                            <p className="plans-benefit-text">
                                Reduce your carbon footprint with our sustainable transportation solution.
                            </p>
                        </div>
                        <div>
                            <h4 className="plans-benefit-title cost">Cost-Effective</h4>
                            <p className="plans-benefit-text">
                                Save money compared to traditional transportation methods.
                            </p>
                        </div>
                        <div>
                            <h4 className="plans-benefit-title health">Stay Healthy</h4>
                            <p className="plans-benefit-text">
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