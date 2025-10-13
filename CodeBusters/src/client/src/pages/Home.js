import React, { useState } from 'react';
import Navbar from '../components/Navbar';

// Feature Card Component with hover effects
const FeatureCard = ({ title, description, color, glowColor }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div 
            style={{
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                padding: '25px',
                borderRadius: '12px',
                textAlign: 'center',
                boxShadow: isHovered 
                    ? `0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px ${glowColor}` 
                    : '0 8px 25px rgba(0, 0, 0, 0.3)',
                border: isHovered 
                    ? `2px solid ${glowColor}` 
                    : '1px solid rgba(255, 255, 255, 0.1)',
                transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
                transition: 'all 0.4s ease',
                cursor: 'pointer'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <h3 style={{
                fontSize: '1.4rem',
                fontWeight: 'bold',
                marginBottom: '15px',
                color: color
            }}>{title}</h3>
            <p style={{
                fontSize: '1rem',
                opacity: '0.9',
                lineHeight: '1.5'
            }}>{description}</p>
        </div>
    );
};

const Home = () => {
    return (
        <>
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #2c3e50 100%)',
                backgroundImage: 'url(https://cdn01.bcycle.com/libraries/images/default-source/default-library/ths00321-(2).jpg?sfvrsn=ab112cc5_0)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
                position: 'relative'
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

                {/* Hero Section */}
                <div style={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh',
                    padding: '20px',
                    textAlign: 'center',
                    color: 'white'
                }}>
                    <h1 style={{
                        fontSize: '4rem',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)',
                        maxWidth: '900px',
                        lineHeight: '1.2'
                    }}>
                        CodeBusters BikeShare
                    </h1>
                    
                    <h2 style={{
                        fontSize: '2.2rem',
                        fontWeight: '300',
                        marginBottom: '30px',
                        textShadow: '1px 1px 3px rgba(0, 0, 0, 0.7)',
                        maxWidth: '800px',
                        lineHeight: '1.4'
                    }}>
                        Advanced Bike Sharing Management System
                    </h2>

                    <div style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        padding: '30px',
                        borderRadius: '15px',
                        marginBottom: '40px',
                        maxWidth: '900px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                    }}>
                        <h3 style={{
                            fontSize: '1.8rem',
                            fontWeight: 'bold',
                            marginBottom: '20px',
                            color: '#4a90e2'
                        }}>
                            About Our System
                        </h3>
                        <p style={{
                            fontSize: '1.1rem',
                            marginBottom: '20px',
                            lineHeight: '1.7',
                            textAlign: 'left'
                        }}>
                            Our bike-sharing system promotes <strong>low-cost mobility</strong>, <strong>exercise</strong>, and <strong>low-emission transportation</strong> by making a variety of bikes and electric bikes (e-bikes) available to occasional riders. Although simple to use, it comprises several sophisticated components divided into modular systems.
                        </p>
                        
                        <p style={{
                            fontSize: '1.1rem',
                            marginBottom: '20px',
                            lineHeight: '1.7',
                            textAlign: 'left'
                        }}>
                            The <strong>CodeBusters BikeShare management system</strong> coordinates docks, bikes/e-bikes, riders, and operators across the entire city. It exposes comprehensive APIs and intuitive UIs to find, reserve, unlock, ride, and return bikes seamlessly.
                        </p>
                        
                        <p style={{
                            fontSize: '1.1rem',
                            marginBottom: '0',
                            lineHeight: '1.7',
                            textAlign: 'left'
                        }}>
                            Our system features an advanced operator dashboard that represents stations on an interactive map with real-time bike counts and management actions (rebalancing, returning, reserving). The application demonstrates core software-design principles including <strong>modularity</strong>, <strong>interfaces</strong>, <strong>state management</strong>, <strong>event-driven architecture</strong>, <strong>permission systems</strong>, and <strong>fault handling</strong>.
                        </p>
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '20px',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        <button 
                            style={{
                                padding: '15px 30px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '25px',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
                                transition: 'all 0.3s ease',
                                textDecoration: 'none'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.backgroundColor = '#218838';
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.backgroundColor = '#28a745';
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.3)';
                            }}
                            onClick={() => window.location.href = '/register'}
                        >
                            Get Started
                        </button>

                        <button 
                            style={{
                                padding: '15px 30px',
                                backgroundColor: 'transparent',
                                color: 'white',
                                border: '2px solid white',
                                borderRadius: '25px',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                textDecoration: 'none'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.backgroundColor = 'white';
                                e.target.style.color = '#357abd';
                                e.target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = 'white';
                                e.target.style.transform = 'translateY(0)';
                            }}
                            onClick={() => window.location.href = '/login'}
                        >
                            Sign In
                        </button>
                    </div>

                    {/* Enhanced Feature highlights with hover effects */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '30px',
                        marginTop: '60px',
                        maxWidth: '1200px',
                        width: '100%'
                    }}>
                        <FeatureCard 
                            title="Smart Dashboard"
                            description="Comprehensive operator dashboard with real-time station monitoring, bike counts, and management tools for efficient fleet operations."
                            color="#4a90e2"
                            glowColor="rgba(74, 144, 226, 0.7)"
                        />

                        <FeatureCard 
                            title="Interactive Map"
                            description="Advanced mapping system showing station locations, bike availability, and real-time updates for seamless navigation and planning."
                            color="#27ae60"
                            glowColor="rgba(39, 174, 96, 0.7)"
                        />

                        <FeatureCard 
                            title="Fleet Management"
                            description="Complete bike and e-bike fleet coordination with rebalancing capabilities, maintenance tracking, and automated status updates."
                            color="#e74c3c"
                            glowColor="rgba(231, 76, 60, 0.7)"
                        />

                        <FeatureCard 
                            title="User Experience"
                            description="Intuitive interface for riders to find, reserve, unlock, and return bikes with integrated payment systems and ride history."
                            color="#f39c12"
                            glowColor="rgba(243, 156, 18, 0.7)"
                        />

                        <FeatureCard 
                            title="Event-Driven Architecture"
                            description="Modern software architecture with modular interfaces, state management, and comprehensive fault handling for reliable operations."
                            color="#9b59b6"
                            glowColor="rgba(155, 89, 182, 0.7)"
                        />

                        <FeatureCard 
                            title="Sustainable Mobility"
                            description="Promoting low-cost, low-emission transportation solutions that encourage exercise and reduce urban congestion."
                            color="#1abc9c"
                            glowColor="rgba(26, 188, 156, 0.7)"
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default Home;