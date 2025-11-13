import React from 'react';
import './style/Home.css';

// Feature Card Component with hover effects
const FeatureCard = ({ title, description, colorClass }) => {
    return (
        <div className={`feature-card ${colorClass}`}>
            <h3 className={colorClass}>{title}</h3>
            <p>{description}</p>
        </div>
    );
};

const Home = () => {
    return (
        <>
            <div className="home-container">
                {/* Dark overlay for better text readability */}
                <div className="home-overlay"></div>

                {/* Hero Section */}
                <div className="home-hero">
                    <h1 className="home-title">
                        CodeBusters BikeShare
                    </h1>
                    
                    <h2 className="home-subtitle">
                        Advanced Bike Sharing Management System
                    </h2>

                    <div className="home-about">
                        <h3>
                            About Our System
                        </h3>
                        <p>
                            Our bike-sharing system promotes <strong>low-cost mobility</strong>, <strong>exercise</strong>, and <strong>low-emission transportation</strong> by making a variety of bikes and electric bikes (e-bikes) available to occasional riders. Although simple to use, it comprises several sophisticated components divided into modular systems.
                        </p>
                        
                        <p>
                            The <strong>CodeBusters BikeShare management system</strong> coordinates docks, bikes/e-bikes, riders, and operators across the entire city. It exposes comprehensive APIs and intuitive UIs to find, reserve, unlock, ride, and return bikes seamlessly.
                        </p>
                        
                        <p>
                            Our system features an advanced operator dashboard that represents stations on an interactive map with real-time bike counts and management actions (rebalancing, returning, reserving). The application demonstrates core software-design principles including <strong>modularity</strong>, <strong>interfaces</strong>, <strong>state management</strong>, <strong>event-driven architecture</strong>, <strong>permission systems</strong>, and <strong>fault handling</strong>.
                        </p>
                    </div>

                    <div className="home-buttons">
                        <button 
                            className="home-button-primary"
                            onClick={() => window.location.href = '/register'}
                        >
                            Get Started
                        </button>

                        <button 
                            className="home-button-secondary"
                            onClick={() => window.location.href = '/login'}
                        >
                            Sign In
                        </button>
                    </div>

                    {/* Enhanced Feature highlights with hover effects */}
                    <div className="home-features">
                        <FeatureCard 
                            title="Smart Dashboard"
                            description="Comprehensive operator dashboard with real-time station monitoring, bike counts, and management tools for efficient fleet operations."
                            colorClass="blue"
                        />

                        <FeatureCard 
                            title="Interactive Map"
                            description="Advanced mapping system showing station locations, bike availability, and real-time updates for seamless navigation and planning."
                            colorClass="green"
                        />

                        <FeatureCard 
                            title="Fleet Management"
                            description="Complete bike and e-bike fleet coordination with rebalancing capabilities, maintenance tracking, and automated status updates."
                            colorClass="red"
                        />

                        <FeatureCard 
                            title="User Experience"
                            description="Intuitive interface for riders to find, reserve, unlock, and return bikes with integrated payment systems and ride history."
                            colorClass="orange"
                        />

                        <FeatureCard 
                            title="Event-Driven Architecture"
                            description="Modern software architecture with modular interfaces, state management, and comprehensive fault handling for reliable operations."
                            colorClass="purple"
                        />

                        <FeatureCard 
                            title="Sustainable Mobility"
                            description="Promoting low-cost, low-emission transportation solutions that encourage exercise and reduce urban congestion."
                            colorClass="teal"
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default Home;