import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './components/Home'
import About from './components/About'
import Contact from './components/Contact'
import Collection from './components/Collection'
import CollectionDetail from './components/CollectionDetail'
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
import LogisticsDashboard from './components/LogisticsDashboard'
import LogisticsIssuesPage from './components/LogisticsIssuesPage'
import DesignerCollectionsPage from './components/DesignerCollectionsPage'
import Blog from './components/Blog'
import BlogDetail from './components/BlogDetail'
import AdminBlog from './components/AdminBlog'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'

const AppRoutes = () => {
  const { profile } = useAuth()
  const isDistributor = profile?.role === 'distributer'
  const isDesigner = profile?.role === 'modni_dizajner'
  const isEndUser = profile?.role === 'krajnji_korisnik'

  return (
    <Routes>
      {!isDistributor && (
        <>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route
            path="/collection"
            element={isEndUser ? <Navigate to="/" replace /> : <Collection />}
          />
          <Route
            path="/collection/:id"
            element={isEndUser ? <Navigate to="/" replace /> : <CollectionDetail />}
          />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:productId" element={<Product />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slugOrId" element={<BlogDetail />} />
          <Route
            path="/designer/collections"
            element={isDesigner ? <DesignerCollectionsPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/admin/blog"
            element={profile?.role === 'superadmin' ? <AdminBlog /> : <Navigate to="/" replace />}
          />
        </>
      )}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/logistics" element={<LogisticsDashboard />} />
      <Route path="/logistics/issues" element={<LogisticsIssuesPage />} />
      {isDistributor && <Route path="*" element={<Navigate to="/logistics" replace />} />}
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <CartProvider>
          <Router>
            <AppRoutes />
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

