import React from 'react';
import './PricingDisplay.css';

const PricingDisplay = () => {
  return (
    <div className="pricing-container">
      <h2 className="pricing-title">Bike Rental Pricing</h2>
      <div className="pricing-cards">
        <div className="pricing-card standard">
          <div className="bike-icon">🚲</div>
          <h3 className="bike-type">Standard Bike</h3>
          <div className="price">
            <span className="price-amount">10¢</span>
            <span className="price-unit">per minute</span>
          </div>
          <div className="features">
            <ul>
              <li>✓ Manual pedaling</li>
              <li>✓ Reliable and sturdy</li>
              <li>✓ Perfect for short trips</li>
              <li>✓ Most affordable option</li>
            </ul>
          </div>
        </div>

        <div className="pricing-card ebike">
          <div className="bike-icon">⚡</div>
          <h3 className="bike-type">E-Bike</h3>
          <div className="price">
            <span className="price-amount">25¢</span>
            <span className="price-unit">per minute</span>
          </div>
          <div className="features">
            <ul>
              <li>⚡ Electric assistance</li>
              <li>⚡ Longer range capability</li>
              <li>⚡ Easy uphill climbing</li>
              <li>⚡ Premium experience</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="pricing-info">
        <p className="info-text">
          <strong>Note:</strong> Pricing starts when you reserve a bike and continues until you return it to any station.
          Maximum rental time is 24 hours.
        </p>
      </div>
    </div>
  );
};

export default PricingDisplay;