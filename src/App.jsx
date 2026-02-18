import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './components/Home'
import About from './components/About'
import Contact from './components/Contact'
import Collection from './components/Collection'
import CollectionDetail from './components/CollectionDetail'
import Shop from './components/Shop'
import NewCollections from './components/NewCollections'
import NewCollectionDetail from './components/NewCollectionDetail'
import Product from './components/Product'
import CartPage from './components/CartPage'
import Checkout from './components/Checkout'
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
import TesterCollectionsPage from './components/TesterCollectionsPage'
import LabDashboard from './components/LabDashboard'
import Blog from './components/Blog'
import BlogDetail from './components/BlogDetail'
import AdminBlog from './components/AdminBlog'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'

const AppRoutes = () => {
  const { profile, loading: authLoading } = useAuth()
  const isDistributor = profile?.role === 'distributer'
  const isDesigner = profile?.role === 'modni_dizajner'
  const isTester = profile?.role === 'tester_kvaliteta'
  const isLaborant = profile?.role === 'laborant'
  const isEndUser = profile?.role === 'krajnji_korisnik'

  return (
    <Routes>
      {!isDistributor && (
        <>
          <Route
            path="/"
            element={
              isTester ? (
                <Navigate to="/tester/collections" replace />
              ) : isLaborant ? (
                <Navigate to="/lab/dashboard" replace />
              ) : (
                <Home />
              )
            }
          />
          <Route
            path="/about"
            element={
              isTester ? (
                <Navigate to="/tester/collections" replace />
              ) : isLaborant ? (
                <Navigate to="/lab/dashboard" replace />
              ) : (
                <About />
              )
            }
          />
          <Route
            path="/contact"
            element={
              isTester ? (
                <Navigate to="/tester/collections" replace />
              ) : isLaborant ? (
                <Navigate to="/lab/dashboard" replace />
              ) : (
                <Contact />
              )
            }
          />
          <Route
            path="/collection"
            element={isEndUser ? <Navigate to="/" replace /> : <Collection />}
          />
          <Route
            path="/collection/:id"
            element={isEndUser ? <Navigate to="/" replace /> : <CollectionDetail />}
          />
          <Route path="/shop" element={<Shop />} />
          <Route 
            path="/new-collections" 
            element={profile?.role === 'krajnji_korisnik' ? <NewCollections /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/new-collections/:collectionId" 
            element={profile?.role === 'krajnji_korisnik' ? <NewCollectionDetail /> : <Navigate to="/" replace />} 
          />
          <Route path="/product/:productId" element={<Product />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route
            path="/blog"
            element={
              isTester ? (
                <Navigate to="/tester/collections" replace />
              ) : isLaborant ? (
                <Navigate to="/lab/dashboard" replace />
              ) : (
                <Blog />
              )
            }
          />
          <Route
            path="/blog/:slugOrId"
            element={
              isTester ? (
                <Navigate to="/tester/collections" replace />
              ) : isLaborant ? (
                <Navigate to="/lab/dashboard" replace />
              ) : (
                <BlogDetail />
              )
            }
          />
          <Route
            path="/designer/collections"
            element={authLoading || isDesigner ? <DesignerCollectionsPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/tester/collections"
            element={authLoading || isTester ? <TesterCollectionsPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/lab/dashboard"
            element={authLoading || isLaborant ? <LabDashboard /> : <Navigate to="/" replace />}
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

