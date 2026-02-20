import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Navbar = ({ activePath }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, logout } = useAuth()
  const isDistributor = profile?.role === 'distributer'
  const isDesigner = profile?.role === 'modni_dizajner'
  const isTester = profile?.role === 'tester_kvaliteta'
  const isLaborant = profile?.role === 'laborant'
  const isSupplier = profile?.role === 'dobavljac_materijala'
  const isManufacturer = profile?.role === 'proizvodjac'
  const isMarketingAsistent = profile?.role === 'marketing_asistent'
  const isAccountant = profile?.role === 'racunovodja'

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
          <Link to={isDistributor ? '/logistics' : isMarketingAsistent ? '/blog' : isAccountant ? '/accountant/transactions' : '/'}>Piccola</Link>
        </div>
        <ul className="navbar-menu">
          {isDistributor ? (
            <>
              <li className="navbar-item">
                <Link to="/logistics" className={`navbar-link ${isActive('/logistics') ? 'active' : ''}`}>
                  Logistika
                </Link>
              </li>
              <li className="navbar-item">
                <Link
                  to="/logistics/issues"
                  className={`navbar-link ${isActive('/logistics/issues') ? 'active' : ''}`}
                >
                  Problemi u isporuci
                </Link>
              </li>
            </>
          ) : isMarketingAsistent ? (
            <>
              <li className="navbar-item">
                <Link to="/blog" className={`navbar-link ${isActive('/blog') ? 'active' : ''}`}>
                  Blog
                </Link>
              </li>
              <li className="navbar-item">
                <Link
                  to="/admin/blog"
                  className={`navbar-link ${isActive('/admin/blog') ? 'active' : ''}`}
                >
                  Upravljanje Blogom
                </Link>
              </li>
            </>
          ) : isAccountant ? (
            <>
              <li className="navbar-item">
                <Link
                  to="/accountant/transactions"
                  className={`navbar-link ${isActive('/accountant/transactions') ? 'active' : ''}`}
                >
                  Transakcije
                </Link>
              </li>
            </>
          ) : (
            <>
              {profile?.role !== 'superadmin' && !isDesigner && !isTester && !isLaborant && !isSupplier && !isManufacturer && (
                <li className="navbar-item">
                  <Link to="/" className={`navbar-link ${isActive('/') ? 'active' : ''}`}>
                    Početna
                  </Link>
                </li>
              )}
              {isDesigner && (
                <>
                  <li className="navbar-item">
                    <Link
                      to="/designer/collections"
                      className={`navbar-link ${isActive('/designer/collections') ? 'active' : ''}`}
                    >
                      Razvoj kolekcija
                    </Link>
                  </li>
                  <li className="navbar-item">
                    <Link
                      to="/designer/razvoj-modela"
                      className={`navbar-link ${isActive('/designer/razvoj-modela') ? 'active' : ''}`}
                    >
                      Razvoj modela
                    </Link>
                  </li>
                </>
              )}
              {isTester && (
                <li className="navbar-item">
                  <Link
                    to="/tester/collections"
                    className={`navbar-link ${isActive('/tester/collections') ? 'active' : ''}`}
                  >
                    Pregled kvaliteta
                  </Link>
                </li>
              )}
              {isLaborant && (
                <li className="navbar-item">
                  <Link
                    to="/lab/dashboard"
                    className={`navbar-link ${isActive('/lab/dashboard') ? 'active' : ''}`}
                  >
                    Laboratorija
                  </Link>
                </li>
              )}
              {isSupplier && (
                <li className="navbar-item">
                  <Link
                    to="/supplier/inventory"
                    className={`navbar-link ${isActive('/supplier/inventory') ? 'active' : ''}`}
                  >
                    Zalihe i zahtevi
                  </Link>
                </li>
              )}
              {isManufacturer && (
                <li className="navbar-item">
                  <Link
                    to="/manufacturer/proizvodnja"
                    className={`navbar-link ${isActive('/manufacturer/proizvodnja') ? 'active' : ''}`}
                  >
                    Proizvodnja
                  </Link>
                </li>
              )}
              {!isSupplier && !isDesigner && !isManufacturer && (
                <li className="navbar-item">
                  <Link to="/shop" className={`navbar-link ${isActive('/shop') ? 'active' : ''}`}>
                    Prodavnica
                  </Link>
                </li>
              )}
              {profile?.role === 'krajnji_korisnik' && (
                <li className="navbar-item">
                  <Link to="/new-collections" className={`navbar-link ${isActive('/new-collections') ? 'active' : ''}`}>
                    Nove kolekcije
                  </Link>
                </li>
              )}
              {!isDesigner && !isTester && !isLaborant && !isSupplier && !isManufacturer && (
                <li className="navbar-item">
                  <Link to="/blog" className={`navbar-link ${isActive('/blog') ? 'active' : ''}`}>
                    Blog
                  </Link>
                </li>
              )}
              {user && profile?.role !== 'krajnji_korisnik' && profile?.role !== 'superadmin' && !isSupplier && !isManufacturer && (
                <li className="navbar-item">
                  <Link
                    to="/collection"
                    className={`navbar-link ${isActive('/collection') ? 'active' : ''}`}
                  >
                    Kolekcije
                  </Link>
                </li>
              )}
              {profile?.role !== 'superadmin' && !isDesigner && !isTester && !isLaborant && !isSupplier && !isManufacturer && (
                <li className="navbar-item">
                  <Link to="/about" className={`navbar-link ${isActive('/about') ? 'active' : ''}`}>
                    O nama
                  </Link>
                </li>
              )}
              {profile?.role !== 'superadmin' && !isDesigner && !isTester && !isLaborant && !isSupplier && !isManufacturer && (
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
                <>
                  <li className="navbar-item">
                    <Link
                      to="/admin/blog"
                      className={`navbar-link ${isActive('/admin/blog') ? 'active' : ''}`}
                    >
                      Upravljanje Blogom
                    </Link>
                  </li>
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
                </>
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
