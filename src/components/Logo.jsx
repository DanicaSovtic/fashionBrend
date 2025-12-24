import React from 'react'
import './Logo.css'

const Logo = () => {
  return (
    <div className="brand-logo">
      {/* Vešalica */}
      <div className="logo-hanger">
        <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Hook */}
          <path d="M25 5C25 5 20 5 20 8C20 10 22 12 25 12C28 12 30 10 30 8C30 5 25 5 25 5Z" fill="#000000"/>
          {/* Bar */}
          <path d="M15 15L15 45L35 45L35 15L25 12L15 15Z" fill="#000000"/>
        </svg>
      </div>
      
      {/* Brand name */}
      <div className="logo-text">
        <span className="logo-my">My</span>
        <span className="logo-divina-style"> Divina Style</span>
        <span className="logo-heart">❤️</span>
      </div>
      
      {/* Subtitle */}
      <div className="logo-subtitle">
        · FASHION ONLINE STORE ·
      </div>
    </div>
  )
}

export default Logo

