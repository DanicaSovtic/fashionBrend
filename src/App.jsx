import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import About from './components/About'
import Contact from './components/Contact'
import Collection from './components/Collection'
import Shop from './components/Shop'
import Product from './components/Product'
import CartPage from './components/CartPage'
import CartDrawer from './components/CartDrawer'
import CartFloatingButton from './components/CartFloatingButton'
import ChatBotWidget from './components/ChatBotWidget'
import { CartProvider } from './context/CartContext'
import FavoritesPage from './components/FavoritesPage'
import { FavoritesProvider } from './context/FavoritesContext'
import FavoritesFloatingButton from './components/FavoritesFloatingButton'
import AuthPage from './components/AuthPage'
import UsersPage from './components/UsersPage'
import ResetPasswordPage from './components/ResetPasswordPage'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <CartProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/collection" element={<Collection />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:productId" element={<Product />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Routes>
            <CartDrawer />
            <CartFloatingButton />
            <FavoritesFloatingButton />
            <ChatBotWidget />
          </Router>
        </CartProvider>
      </FavoritesProvider>
    </AuthProvider>
  )
}

export default App

