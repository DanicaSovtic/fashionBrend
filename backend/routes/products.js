import { Router } from 'express'
import { getProducts, seedProducts } from '../services/productsService.js'

const router = Router()

router.get('/products', async (req, res, next) => {
  try {
    const products = await getProducts()
    res.json(products)
  } catch (error) {
    next(error)
  }
})

router.post('/seed-products', async (req, res, next) => {
  try {
    const replace = req.query.replace === 'true'
    const result = await seedProducts({ replace })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

export default router
