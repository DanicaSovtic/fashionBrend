import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import productsRouter from './routes/products.js'
import authRouter from './routes/auth.js'
import logisticsRouter from './routes/logistics.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', productsRouter)
app.use('/api', authRouter)
app.use('/api', logisticsRouter)

app.use((err, req, res, next) => {
  console.error(err)
  const status = err?.status || 500
  res.status(status).json({ error: err?.message || 'Server error' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
