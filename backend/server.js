import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import productsRouter from './routes/products.js'
import authRouter from './routes/auth.js'
import logisticsRouter from './routes/logistics.js'
import cartRouter from './routes/cart.js'
import favoritesRouter from './routes/favorites.js'
import collectionsRouter from './routes/collections.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Test endpoint za proveru da li proxy radi
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!', timestamp: new Date().toISOString() })
})

// Collections router prvi da se izbegne konflikt sa drugim rutama
app.use('/api', collectionsRouter)
app.use('/api', productsRouter)
app.use('/api', authRouter)
app.use('/api', logisticsRouter)
app.use('/api', cartRouter)
app.use('/api', favoritesRouter)

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
