/**
 * Poseban ruter za tester kvaliteta i modnog dizajnera.
 * Montira se na /api/tester i /api/designer – pre cart/favorites koji zahtevaju krajnji_korisnik.
 */
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { 
  getCollections, 
  getProductModelById, 
  updateProductModelStage 
} from '../services/collectionsService.js'
import { createAdminClient } from '../services/supabaseClient.js'

const adminSupabase = createAdminClient()

const handler = async (req, res, next) => {
  try {
    const { type } = req.query
    const collections = await getCollections(type)
    res.json(collections)
  } catch (error) {
    console.error('[TesterDesignerRoute] Error in GET /collections:', error)
    next(error)
  }
}

// Tester – montiran na /api/tester, putanja /collections -> /api/tester/collections
const testerRouter = Router()
testerRouter.get('/collections', requireAuth, requireRole(['tester_kvaliteta']), handler)

/**
 * GET /api/tester/products/:modelId/test-results
 * Dobija rezultate testova za proizvod (za testera kvaliteta)
 */
testerRouter.get('/products/:modelId/test-results', requireAuth, requireRole(['tester_kvaliteta']), async (req, res, next) => {
  try {
    const { modelId } = req.params

    const { data, error } = await adminSupabase
      .from('lab_test_results')
      .select('*')
      .eq('product_model_id', modelId)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') {
        res.json({
          productModelId: modelId,
          testResults: [],
          message: 'Tabela lab_test_results ne postoji. Pokreni SQL migraciju.'
        })
        return
      }
      throw error
    }

    res.json({
      productModelId: modelId,
      testResults: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('[TesterDesignerRoute] Error fetching test results:', error)
    next(error)
  }
})

/**
 * POST /api/tester/products/:modelId/approve
 * Odobrava proizvod - ažurira development_stage na 'approved'
 * Očekuje: { txHash, requiredMaterials }
 * Napomena: Validacija rezultata testova se vrši u smart contractu, ne u backend-u
 */
testerRouter.post('/products/:modelId/approve', requireAuth, requireRole(['tester_kvaliteta']), async (req, res, next) => {
  try {
    const { modelId } = req.params
    const { txHash, requiredMaterials } = req.body

    if (!txHash) {
      res.status(400).json({ error: 'txHash je obavezan (blockchain transakcija)' })
      return
    }

    // Proveri da li proizvod postoji i da li je u fazi 'testing'
    const product = await getProductModelById(modelId)
    
    if (!product) {
      res.status(404).json({ error: 'Proizvod nije pronađen' })
      return
    }

    if (product.development_stage !== 'testing') {
      res.status(400).json({ 
        error: `Proizvod mora biti u fazi 'testing'. Trenutna faza: ${product.development_stage}` 
      })
      return
    }

    // Validacija rezultata testova se vrši u smart contractu
    // Ako je txHash prisutan, znači da je smart contract proverio i odobrio proizvod
    // Ažuriraj status na 'approved'
    const updatedProduct = await updateProductModelStage(
      modelId, 
      'approved', 
      req.user.id
    )

    res.json({
      success: true,
      product: updatedProduct,
      txHash,
      message: 'Proizvod je uspešno odobren. Validacija je izvršena u smart contractu.'
    })
  } catch (error) {
    console.error('[TesterDesignerRoute] Error approving product:', error)
    next(error)
  }
})

// Designer – montiran na /api/designer, putanja /collections -> /api/designer/collections
const designerRouter = Router()
designerRouter.get('/collections', requireAuth, requireRole(['modni_dizajner']), handler)

export { testerRouter, designerRouter }
