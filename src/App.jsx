import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import About from './components/About'
import Contact from './components/Contact'
import Collection from './components/Collection'
import Shop from './components/Shop'
import Product from './components/Product'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:productId" element={<Product />} />
      </Routes>
    </Router>
  )
}

export default App

