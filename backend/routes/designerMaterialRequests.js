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

    if (!material || !color || !quantity_kg) {
      res.status(400).json({ 
        error: 'material, color i quantity_kg su obavezni' 
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
        supplier_id: supplier_id || null,
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
 * GET /api/designer/material-requests/:id
 * Dobija detalje zahteva
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
