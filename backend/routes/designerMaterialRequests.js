/**
 * Designer Material Requests router
 * Montira se na /api/designer/material-requests
 * Omogućava modnom dizajneru da šalje zahteve dobavljaču materijala
 */
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { createAdminClient } from '../services/supabaseClient.js'

const router = Router()
const adminSupabase = createAdminClient()

/**
 * GET /api/designer/material-requests/models
 * Dobija listu modela sa statusom materijala
 * Query params: collection_id, search
 */
router.get('/models', requireAuth, requireRole(['modni_dizajner']), async (req, res, next) => {
  try {
    const { collection_id, search } = req.query

    // Dohvati modele dizajnera
    let query = adminSupabase
      .from('product_models')
      .select(`
        id,
        name,
        sku,
        collection_id,
        development_stage,
        materials,
        created_at,
        collection:collections(name, season)
      `)
      .order('created_at', { ascending: false })

    if (collection_id) {
      query = query.eq('collection_id', collection_id)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
    }

    const { data: models, error: modelsError } = await query

    if (modelsError) {
      throw modelsError
    }

    // Za svaki model, dohvati status materijala
    const modelsWithStatus = await Promise.all(
      (models || []).map(async (model) => {
        // Dohvati najnoviji zahtev za ovaj model
        const { data: latestRequest } = await adminSupabase
          .from('material_requests')
          .select('status, created_at')
          .eq('product_model_id', model.id)
          .eq('requested_by', req.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        let materialStatus = 'no_request'
        if (latestRequest) {
          materialStatus = latestRequest.status
        }

        return {
          ...model,
          material_status: materialStatus
        }
      })
    )

    res.json({
      models: modelsWithStatus || [],
      count: modelsWithStatus?.length || 0
    })
  } catch (error) {
    console.error('[DesignerMaterialRequests] Error fetching models:', error)
    next(error)
  }
})

/**
 * GET /api/designer/material-requests/suppliers
 * Dobija listu dostupnih dobavljača materijala
 */
router.get('/suppliers', requireAuth, requireRole(['modni_dizajner']), async (req, res, next) => {
  try {
    const { data, error } = await adminSupabase
      .from('profiles')
      .select('user_id, full_name, role')
      .eq('role', 'dobavljac_materijala')
      .order('full_name', { ascending: true })

    if (error) {
      throw error
    }

    res.json({
      suppliers: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('[DesignerMaterialRequests] Error fetching suppliers:', error)
    next(error)
  }
})

/**
 * POST /api/designer/material-requests
 * Kreira novi zahtev za materijal
 * Body: { product_model_id, material, color, quantity_kg, deadline, supplier_id, notes }
 */
router.post('/', requireAuth, requireRole(['modni_dizajner']), async (req, res, next) => {
  try {
    const { product_model_id, material, color, quantity_kg, deadline, supplier_id, notes } = req.body

    if (!material || !color || !quantity_kg || !supplier_id) {
      res.status(400).json({ 
        error: 'Materijal, boja, količina i dobavljač su obavezni' 
      })
      return
    }

    // Dohvati informacije o modelu
    let modelName = null
    let modelSku = null
    let collectionId = null

    if (product_model_id) {
      const { data: model } = await adminSupabase
        .from('product_models')
        .select('name, sku, collection_id')
        .eq('id', product_model_id)
        .single()

      if (model) {
        modelName = model.name
        modelSku = model.sku
        collectionId = model.collection_id
      }
    }

    const { data, error } = await adminSupabase
      .from('material_requests')
      .insert({
        product_model_id: product_model_id || null,
        collection_id: collectionId,
        requested_by: req.user.id,
        supplier_id,
        model_name: modelName,
        model_sku: modelSku,
        material,
        color,
        quantity_kg: parseFloat(quantity_kg),
        deadline: deadline || null,
        notes: notes || null,
        status: 'new'
      })
      .select()
      .single()

    if (error) {
      if (error.code === '42P01') {
        res.status(500).json({
          error: 'Tabela material_requests ne postoji. Pokreni migraciju: create_supplier_tables.sql'
        })
        return
      }
      throw error
    }

    // Kada dizajner pošalje zahtev za materijal, proizvod prelazi u fazu Razvoj
    if (product_model_id) {
      await adminSupabase
        .from('product_models')
        .update({
          development_stage: 'development',
          updated_at: new Date().toISOString()
        })
        .eq('id', product_model_id)
    }

    res.json({
      success: true,
      request: data,
      message: 'Zahtev je uspešno poslat'
    })
  } catch (error) {
    console.error('[DesignerMaterialRequests] Error creating request:', error)
    next(error)
  }
})

/**
 * GET /api/designer/material-requests
 * Dobija listu poslatih zahteva dizajnera
 * Query params: status, collection_id
 */
router.get('/', requireAuth, requireRole(['modni_dizajner']), async (req, res, next) => {
  try {
    const { status, collection_id } = req.query

    let query = adminSupabase
      .from('material_requests')
      .select(`
        *,
        supplier_profile:profiles!material_requests_supplier_id_fkey(full_name),
        product_model:product_models(name, sku),
        collection:collections(name, season)
      `)
      .eq('requested_by', req.user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (collection_id) {
      query = query.eq('collection_id', collection_id)
    }

    const { data, error } = await query

    if (error) {
      if (error.code === '42P01') {
        res.json({
          requests: [],
          message: 'Tabela material_requests ne postoji. Pokreni migraciju: create_supplier_tables.sql'
        })
        return
      }
      throw error
    }

    res.json({
      requests: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('[DesignerMaterialRequests] Error fetching requests:', error)
    next(error)
  }
})

/**
 * GET /api/designer/material-requests/completed-products
 * Dobija listu završenih proizvoda od proizvođača
 * Query params: collection_id
 */
router.get('/completed-products', requireAuth, requireRole(['modni_dizajner']), async (req, res, next) => {
  try {
    const { collection_id } = req.query

    let query = adminSupabase
      .from('completed_products_from_manufacturer')
      .select('*')
      .eq('designer_id', req.user.id)
      .order('completed_at', { ascending: false })

    if (collection_id) {
      query = query.eq('collection_id', collection_id)
    }

    const { data, error } = await query

    if (error) {
      if (error.code === '42P01') {
        res.json({
          products: [],
          message: 'View completed_products_from_manufacturer ne postoji. Pokreni migraciju: add_completed_products_view.sql'
        })
        return
      }
      throw error
    }

    res.json({
      products: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('[DesignerMaterialRequests] Error fetching completed products:', error)
    next(error)
  }
})

/**
 * POST /api/designer/material-requests/completed-products/:sewing_order_id/return-for-rework
 * Dizajner vraća proizvod na doradu: development_stage -> 'development', nalog za šivenje ponovo otvoren (in_progress), sa razlogom
 * Body: { reason: string } (razlog vraćanja – opciono ali preporučeno)
 */
router.post('/completed-products/:sewing_order_id/return-for-rework', requireAuth, requireRole(['modni_dizajner']), async (req, res, next) => {
  try {
    const { sewing_order_id } = req.params
    const { reason } = req.body || {}
    const reasonText = reason != null ? String(reason).trim() : null

    const { data: completedProduct, error: checkError } = await adminSupabase
      .from('completed_products_from_manufacturer')
      .select('product_model_id')
      .eq('sewing_order_id', sewing_order_id)
      .eq('designer_id', req.user.id)
      .single()
    if (checkError || !completedProduct?.product_model_id) {
      res.status(404).json({ error: 'Završeni proizvod nije pronađen ili ne pripada vama' })
      return
    }

    const now = new Date().toISOString()

    const { error: updateModelError } = await adminSupabase
      .from('product_models')
      .update({ development_stage: 'development', updated_at: now })
      .eq('id', completedProduct.product_model_id)
    if (updateModelError) throw updateModelError

    const { error: updateOrderError } = await adminSupabase
      .from('sewing_orders')
      .update({
        status: 'in_progress',
        return_for_rework_reason: reasonText || null,
        return_for_rework_at: now,
        updated_at: now
      })
      .eq('id', sewing_order_id)
    if (updateOrderError) throw updateOrderError

    res.json({
      success: true,
      message: 'Proizvod je vraćen na doradu. Proizvođač će ponovo videti nalog za šivenje i razlog.'
    })
  } catch (error) {
    console.error('[DesignerMaterialRequests] Error return-for-rework:', error)
    next(error)
  }
})

/**
 * POST /api/designer/material-requests/completed-products/:sewing_order_id/approve-for-testing
 * Dizajner potvrđuje da je zadovoljan – model prelazi u Testiranje (laborant/tester kvaliteta ga odobravaju)
 */
router.post('/completed-products/:sewing_order_id/approve-for-testing', requireAuth, requireRole(['modni_dizajner']), async (req, res, next) => {
  try {
    const { sewing_order_id } = req.params
    const { data: completedProduct, error: checkError } = await adminSupabase
      .from('completed_products_from_manufacturer')
      .select('product_model_id')
      .eq('sewing_order_id', sewing_order_id)
      .eq('designer_id', req.user.id)
      .single()
    if (checkError || !completedProduct?.product_model_id) {
      res.status(404).json({ error: 'Završeni proizvod nije pronađen ili ne pripada vama' })
      return
    }
    const { error: updateError } = await adminSupabase
      .from('product_models')
      .update({ development_stage: 'testing', updated_at: new Date().toISOString() })
      .eq('id', completedProduct.product_model_id)
    if (updateError) throw updateError
    res.json({ success: true, message: 'Proizvod je pušten na testiranje – laborant i tester kvaliteta će ga odobriti.' })
  } catch (error) {
    console.error('[DesignerMaterialRequests] Error approve-for-testing:', error)
    next(error)
  }
})

/**
 * POST /api/designer/material-requests/completed-products/:sewing_order_id/publish
 * Pusti proizvod u prodaju - kreira products zapis i ažurira development_stage na 'approved'
 */
router.post('/completed-products/:sewing_order_id/publish', requireAuth, requireRole(['modni_dizajner']), async (req, res, next) => {
  try {
    const { sewing_order_id } = req.params

    // Proveri da li proizvod pripada ovom dizajneru i da li je završen
    const { data: completedProduct, error: checkError } = await adminSupabase
      .from('completed_products_from_manufacturer')
      .select('*')
      .eq('sewing_order_id', sewing_order_id)
      .eq('designer_id', req.user.id)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        res.status(404).json({ error: 'Završeni proizvod nije pronađen ili ne pripada vama' })
        return
      }
      throw checkError
    }

    // Proveri da li je već kreiran products zapis
    if (completedProduct.product_id) {
      res.status(400).json({ 
        error: 'Proizvod je već pušten u prodaju',
        product_id: completedProduct.product_id
      })
      return
    }

    // Puštanje u prodaju dozvoljeno SAMO kada je tester kvaliteta već odobrio proizvod (development_stage === 'approved')
    if (completedProduct.development_stage !== 'approved') {
      res.status(400).json({
        error: 'Proizvod mora biti odobren od strane testera kvaliteta da bi mogao u prodaju. Trenutna faza: ' + (completedProduct.development_stage || '—')
      })
      return
    }

    // Kreiraj products zapis koristeći postojeću funkciju iz collectionsService
    const { createProductFromModel } = await import('../services/collectionsService.js')
    const product = await createProductFromModel(completedProduct.product_model_id)

    res.json({
      success: true,
      product,
      message: 'Proizvod je uspešno pušten u prodaju'
    })
  } catch (error) {
    console.error('[DesignerMaterialRequests] Error publishing product:', error)
    next(error)
  }
})

/**
 * GET /api/designer/material-requests/:id
 * Dobija detalje zahteva
 * OVA RUTA MORA BITI POSLEDNJA jer će Express pokušati da parsira sve kao :id
 */
router.get('/:id', requireAuth, requireRole(['modni_dizajner']), async (req, res, next) => {
  try {
    const { id } = req.params

    const { data, error } = await adminSupabase
      .from('material_requests')
      .select(`
        *,
        supplier_profile:profiles!material_requests_supplier_id_fkey(full_name, role),
        product_model:product_models(name, sku, materials),
        collection:collections(name, season)
      `)
      .eq('id', id)
      .eq('requested_by', req.user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Zahtev nije pronađen' })
        return
      }
      throw error
    }

    res.json({
      request: data
    })
  } catch (error) {
    console.error('[DesignerMaterialRequests] Error fetching request details:', error)
    next(error)
  }
})

export default router
