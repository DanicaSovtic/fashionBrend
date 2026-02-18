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

/**
 * PATCH /api/designer/products/:modelId/stage
 * Ažurira development_stage proizvoda (za modnog dizajnera)
 * Očekuje: { stage: 'idea' | 'prototype' | 'testing' | 'approved' }
 */
designerRouter.patch('/products/:modelId/stage', requireAuth, requireRole(['modni_dizajner']), async (req, res, next) => {
  try {
    const { modelId } = req.params
    const { stage } = req.body

    console.log('[DesignerRoute] PATCH /products/:modelId/stage called:', { modelId, stage, userId: req.user?.id })

    if (!stage) {
      res.status(400).json({ error: 'Stage je obavezan' })
      return
    }

    const validStages = ['idea', 'prototype', 'testing', 'approved']
    if (!validStages.includes(stage)) {
      res.status(400).json({ 
        error: `Nevažeći stage: ${stage}. Dozvoljeni: ${validStages.join(', ')}` 
      })
      return
    }

    if (!modelId) {
      res.status(400).json({ error: 'Model ID je obavezan' })
      return
    }

    // Proveri da li proizvod postoji
    console.log('[DesignerRoute] Fetching product model:', modelId)
    const product = await getProductModelById(modelId)
    
    if (!product) {
      console.log('[DesignerRoute] Product not found:', modelId)
      res.status(404).json({ error: 'Proizvod nije pronađen' })
      return
    }

    console.log('[DesignerRoute] Product found, updating stage:', { 
      currentStage: product.development_stage, 
      newStage: stage 
    })

    // Ažuriraj status
    const updatedProduct = await updateProductModelStage(
      modelId, 
      stage, 
      req.user.id
    )

    console.log('[DesignerRoute] Successfully updated product stage:', updatedProduct)

    res.json({
      success: true,
      product: updatedProduct,
      message: `Status proizvoda je uspešno ažuriran na: ${stage}`
    })
  } catch (error) {
    console.error('[DesignerRoute] Error updating product stage:', error)
    console.error('[DesignerRoute] Error details:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    })
    
    // Ako je Supabase greška, ekstraktuj korisnu poruku
    if (error?.code) {
      res.status(400).json({ 
        error: error.message || 'Greška pri ažuriranju statusa',
        details: error.details || error.hint || error.code
      })
      return
    }
    
    // Ako je već Error objekat sa statusom
    if (error?.status) {
      res.status(error.status).json({ 
        error: error.message || 'Greška pri ažuriranju statusa'
      })
      return
    }
    
    // Generička greška
    res.status(500).json({ 
      error: error?.message || 'Greška pri ažuriranju statusa',
      details: error?.toString()
    })
  }
})

export { testerRouter, designerRouter }
