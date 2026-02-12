import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import productsRouter from './routes/products.js'
import authRouter from './routes/auth.js'
import logisticsRouter from './routes/logistics.js'
import cartRouter from './routes/cart.js'
import favoritesRouter from './routes/favorites.js'
import collectionsRouter from './routes/collections.js'
import blogRouter from './routes/blog.js'
import ordersRouter from './routes/orders.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// Logging middleware za debug - loguj sve zahteve
app.use((req, res, next) => {
  if (req.path.startsWith('/api/blog')) {
    console.log('[Server] Request received:', req.method, req.path, req.query)
    console.log('[Server] Request URL:', req.url)
    console.log('[Server] Request originalUrl:', req.originalUrl)
  }
  next()
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Test endpoint za proveru da li proxy radi
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!', timestamp: new Date().toISOString() })
})

// Collections router prvi da se izbegne konflikt sa drugim rutama
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/blog')) {
    console.log('[Server] Request going to routers, path:', req.path)
  }
  next()
})

console.log('[Server] Registering routers...')
// Blog router prvi jer ima javne rute bez autentifikacije
app.use('/api', blogRouter)
console.log('[Server] Blog router registered')
app.use('/api', collectionsRouter)
console.log('[Server] Collections router registered')
app.use('/api', productsRouter)
console.log('[Server] Products router registered')
app.use('/api', authRouter)
console.log('[Server] Auth router registered')
app.use('/api', logisticsRouter)
console.log('[Server] Logistics router registered')
app.use('/api', cartRouter)
console.log('[Server] Cart router registered')
app.use('/api', favoritesRouter)
console.log('[Server] Favorites router registered')
app.use('/api', ordersRouter)
console.log('[Server] Orders router registered')

// Catch-all za nepostojeće rute
app.use('/api/*', (req, res, next) => {
  if (req.path.startsWith('/blog')) {
    console.log('[Server] Request not matched by any router, path:', req.path)
  }
  next()
})

app.use((err, req, res, next) => {
  console.error('[Server] Error handler called:', err)
  console.error('[Server] Error status:', err?.status)
  console.error('[Server] Error message:', err?.message)
  const status = err?.status || 500
  res.status(status).json({ error: err?.message || 'Server error' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
