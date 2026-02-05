import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Navbar = ({ activePath }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, logout } = useAuth()
  const isDistributor = profile?.role === 'distributer'

  const currentPath = activePath || location.pathname
  const isActive = (path) => currentPath === path
  const isUsersActive = currentPath.startsWith('/users')

  const handleLogout = async () => {
    await logout()
    navigate('/auth')
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to={isDistributor ? '/logistics' : '/'}>Piccola</Link>
        </div>
        <ul className="navbar-menu">
          {isDistributor ? (
            <li className="navbar-item">
              <Link to="/logistics" className={`navbar-link ${isActive('/logistics') ? 'active' : ''}`}>
                Logistika
              </Link>
            </li>
          ) : (
            <>
              {profile?.role !== 'superadmin' && (
                <li className="navbar-item">
                  <Link to="/" className={`navbar-link ${isActive('/') ? 'active' : ''}`}>
                    Početna
                  </Link>
                </li>
              )}
              <li className="navbar-item">
                <Link to="/shop" className={`navbar-link ${isActive('/shop') ? 'active' : ''}`}>
                  Prodavnica
                </Link>
              </li>
              <li className="navbar-item">
                <Link
                  to="/collection"
                  className={`navbar-link ${isActive('/collection') ? 'active' : ''}`}
                >
                  Kolekcije
                </Link>
              </li>
              {profile?.role !== 'superadmin' && (
                <li className="navbar-item">
                  <Link to="/about" className={`navbar-link ${isActive('/about') ? 'active' : ''}`}>
                    O nama
                  </Link>
                </li>
              )}
              {profile?.role !== 'superadmin' && (
                <li className="navbar-item">
                  <Link
                    to="/contact"
                    className={`navbar-link ${isActive('/contact') ? 'active' : ''}`}
                  >
                    Kontakt
                  </Link>
                </li>
              )}
              {profile?.role === 'superadmin' && (
                <li className="navbar-item navbar-dropdown">
                  <span
                    className={`navbar-link navbar-dropdown-toggle ${isUsersActive ? 'active' : ''}`}
                  >
                    Korisnici
                  </span>
                  <div className="navbar-dropdown-menu">
                    <Link to="/users?view=create" className="navbar-dropdown-item">
                      Kreiraj korisnika
                    </Link>
                    <Link to="/users?view=list" className="navbar-dropdown-item">
                      Pregled korisnika
                    </Link>
                  </div>
                </li>
              )}
            </>
          )}
        </ul>
        <div className="navbar-auth">
          {profile?.full_name && (
            <span className="navbar-user">
              <span className="navbar-user-name">{profile.full_name}</span>
              {profile?.role && <span className="navbar-user-role">{profile.role}</span>}
            </span>
          )}
          {user ? (
            <button type="button" className="navbar-auth-button" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <Link to="/auth" className="navbar-auth-link">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
