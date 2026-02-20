/**
 * Manufacturer router - za proizvođača
 * Montira se na /api/manufacturer
 */
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { createAdminClient } from '../services/supabaseClient.js'

const router = Router()
const adminSupabase = createAdminClient()

/**
 * GET /api/manufacturer/dashboard-stats
 * Dobija statistiku za dashboard proizvođača
 */
router.get('/dashboard-stats', requireAuth, requireRole(['proizvodjac']), async (req, res, next) => {
  try {
    const { data: stats } = await adminSupabase
      .from('material_shipments')
      .select('status, problem_reported')
      .eq('manufacturer_id', req.user.id)

    const dashboardStats = {
      pending_shipments: stats?.filter(s => s.status === 'sent_to_manufacturer').length || 0,
      received_shipments: stats?.filter(s => s.status === 'received').length || 0,
      confirmed_shipments: stats?.filter(s => s.status === 'confirmed').length || 0,
      problem_shipments: stats?.filter(s => s.problem_reported === true).length || 0
    }

    // Statistika za naloge za šivenje
    const { data: ordersStats } = await adminSupabase
      .from('sewing_orders')
      .select('status')
      .eq('manufacturer_id', req.user.id)

    dashboardStats.new_orders = ordersStats?.filter(o => o.status === 'new').length || 0
    dashboardStats.in_progress_orders = ordersStats?.filter(o => o.status === 'in_progress').length || 0
    dashboardStats.completed_orders = ordersStats?.filter(o => o.status === 'completed').length || 0

    res.json(dashboardStats)
  } catch (error) {
    console.error('[Manufacturer] Error fetching dashboard stats:', error)
    next(error)
  }
})

/**
 * GET /api/manufacturer/shipments
 * Dobija listu pošiljki materijala
 * Query params: status, collection_id
 */
router.get('/shipments', requireAuth, requireRole(['proizvodjac']), async (req, res, next) => {
  try {
    const { status, collection_id } = req.query

    let query = adminSupabase
      .from('material_shipments')
      .select(`
        *,
        supplier_profile:profiles!material_shipments_supplier_id_fkey(full_name),
        product_model:product_models(name, sku),
        collection:collections(name, season)
      `)
      .eq('manufacturer_id', req.user.id)
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
          shipments: [],
          message: 'Tabela material_shipments ne postoji. Pokreni migraciju: add_manufacturer_tables.sql'
        })
        return
      }
      throw error
    }

    res.json({
      shipments: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('[Manufacturer] Error fetching shipments:', error)
    next(error)
  }
})

/**
 * GET /api/manufacturer/shipments/:id
 * Dobija detalje pošiljke
 */
router.get('/shipments/:id', requireAuth, requireRole(['proizvodjac']), async (req, res, next) => {
  try {
    const { id } = req.params

    const { data, error } = await adminSupabase
      .from('material_shipments')
      .select(`
        *,
        supplier_profile:profiles!material_shipments_supplier_id_fkey(full_name),
        product_model:product_models(name, sku, materials),
        collection:collections(name, season)
      `)
      .eq('id', id)
      .eq('manufacturer_id', req.user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Pošiljka nije pronađena' })
        return
      }
      throw error
    }

    res.json({
      shipment: data
    })
  } catch (error) {
    console.error('[Manufacturer] Error fetching shipment details:', error)
    next(error)
  }
})

/**
 * PATCH /api/manufacturer/shipments/:id/confirm
 * Potvrđuje prijem materijala i kreira/ažurira nalog za šivenje
 * Body: { quantity_pieces } (opciono, default: 1)
 */
router.patch('/shipments/:id/confirm', requireAuth, requireRole(['proizvodjac']), async (req, res, next) => {
  try {
    const { id } = req.params
    const { quantity_pieces } = req.body

    // Prvo dohvati shipment da dobijemo potrebne podatke
    const { data: shipment, error: shipmentError } = await adminSupabase
      .from('material_shipments')
      .select('*')
      .eq('id', id)
      .eq('manufacturer_id', req.user.id)
      .single()

    if (shipmentError) {
      if (shipmentError.code === 'PGRST116') {
        res.status(404).json({ error: 'Pošiljka nije pronađena' })
        return
      }
      throw shipmentError
    }

    // Ažuriraj status shipment-a na 'confirmed'
    const { data: updatedShipment, error: updateError } = await adminSupabase
      .from('material_shipments')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        received_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('manufacturer_id', req.user.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Dobij deadline iz material_request
    let deadline = null
    if (shipment.material_request_id) {
      const { data: materialRequest } = await adminSupabase
        .from('material_requests')
        .select('deadline, notes')
        .eq('id', shipment.material_request_id)
        .single()
      
      if (materialRequest) {
        deadline = materialRequest.deadline
      }
    }

    // Proveri da li već postoji nalog za ovaj model i proizvođača
    const { data: existingOrder } = await adminSupabase
      .from('sewing_orders')
      .select('id')
      .eq('product_model_id', shipment.product_model_id)
      .eq('manufacturer_id', req.user.id)
      .in('status', ['new', 'in_progress'])
      .limit(1)
      .maybeSingle()

    let sewingOrder
    if (existingOrder) {
      // Ažuriraj postojeći nalog
      const { data: updatedOrder, error: orderError } = await adminSupabase
        .from('sewing_orders')
        .update({
          shipment_id: id,
          material_status: 'ready',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingOrder.id)
        .select()
        .single()

      if (orderError) {
        throw orderError
      }
      sewingOrder = updatedOrder
    } else {
      // Kreiraj novi nalog
      const { data: newOrder, error: orderError } = await adminSupabase
        .from('sewing_orders')
        .insert({
          product_model_id: shipment.product_model_id,
          collection_id: shipment.collection_id,
          manufacturer_id: req.user.id,
          model_name: shipment.model_name,
          model_sku: shipment.model_sku,
          quantity_pieces: quantity_pieces ? parseInt(quantity_pieces) : 1, // Default: 1
          deadline: deadline,
          status: 'new',
          shipment_id: id,
          material_status: 'ready',
          notes: null // Napomena dizajnera će se dobiti iz material_request
        })
        .select()
        .single()

      if (orderError) {
        throw orderError
      }
      sewingOrder = newOrder
    }

    res.json({
      success: true,
      shipment: updatedShipment,
      sewing_order: sewingOrder,
      message: 'Prijem materijala je potvrđen. Nalog za šivenje je spreman.'
    })
  } catch (error) {
    console.error('[Manufacturer] Error confirming shipment:', error)
    next(error)
  }
})

/**
 * PATCH /api/manufacturer/shipments/:id/report-problem
 * Prijavljuje problem sa pošiljkom
 * Očekuje: { problem_reason, problem_comment }
 */
router.patch('/shipments/:id/report-problem', requireAuth, requireRole(['proizvodjac']), async (req, res, next) => {
  try {
    const { id } = req.params
    const { problem_reason, problem_comment } = req.body

    if (!problem_reason) {
      res.status(400).json({ error: 'problem_reason je obavezan' })
      return
    }

    const { data, error } = await adminSupabase
      .from('material_shipments')
      .update({
        status: 'problem_reported',
        problem_reported: true,
        problem_reason,
        problem_comment: problem_comment || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('manufacturer_id', req.user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Pošiljka nije pronađena' })
        return
      }
      throw error
    }

    // Dodaj poruku u thread (opciono)
    if (problem_comment) {
      await adminSupabase
        .from('request_messages')
        .insert({
          request_id: data.material_request_id,
          shipment_id: id,
          author_id: req.user.id,
          author_name: req.profile?.full_name || 'Proizvođač',
          author_role: 'proizvodjac',
          body: `Problem prijavljen: ${problem_reason}. ${problem_comment}`
        })
    }

    res.json({
      success: true,
      shipment: data,
      message: 'Problem je prijavljen'
    })
  } catch (error) {
    console.error('[Manufacturer] Error reporting problem:', error)
    next(error)
  }
})

/**
 * GET /api/manufacturer/sewing-orders
 * Dobija listu naloga za šivenje
 * Query params: status, collection_id
 */
router.get('/sewing-orders', requireAuth, requireRole(['proizvodjac']), async (req, res, next) => {
  try {
    const { status, collection_id } = req.query

    let query = adminSupabase
      .from('sewing_orders')
      .select(`
        *,
        product_model:product_models(name, sku),
        collection:collections(name, season),
        shipment:material_shipments(
          id,
          material,
          color,
          quantity_sent_kg,
          status,
          confirmed_at
        )
      `)
      .eq('manufacturer_id', req.user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (collection_id) {
      query = query.eq('collection_id', collection_id)
    }

    // Dodatni filter po shipment_id ako je prosleđen
    const { shipment_id } = req.query
    if (shipment_id) {
      query = query.eq('shipment_id', shipment_id)
    }

    const { data, error } = await query

    if (error) {
      if (error.code === '42P01') {
        res.json({
          orders: [],
          message: 'Tabela sewing_orders ne postoji. Pokreni migraciju: add_manufacturer_tables.sql'
        })
        return
      }
      throw error
    }

    res.json({
      orders: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('[Manufacturer] Error fetching sewing orders:', error)
    next(error)
  }
})

/**
 * GET /api/manufacturer/sewing-orders/:id
 * Dobija detalje naloga za šivenje sa informacijama o materijalu
 */
router.get('/sewing-orders/:id', requireAuth, requireRole(['proizvodjac']), async (req, res, next) => {
  try {
    const { id } = req.params

    const { data, error } = await adminSupabase
      .from('sewing_orders')
      .select(`
        *,
        product_model:product_models(name, sku),
        collection:collections(name, season),
        shipment:material_shipments(
          id,
          material,
          color,
          quantity_kg,
          quantity_sent_kg,
          status,
          confirmed_at,
          material_request:material_requests(
            notes
          )
        )
      `)
      .eq('id', id)
      .eq('manufacturer_id', req.user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Nalog nije pronađen' })
        return
      }
      throw error
    }

    res.json({
      order: data
    })
  } catch (error) {
    console.error('[Manufacturer] Error fetching sewing order details:', error)
    next(error)
  }
})

/**
 * PATCH /api/manufacturer/sewing-orders/:id/start
 * Pokreće nalog za šivenje
 */
router.patch('/sewing-orders/:id/start', requireAuth, requireRole(['proizvodjac']), async (req, res, next) => {
  try {
    const { id } = req.params

    const { data, error } = await adminSupabase
      .from('sewing_orders')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('manufacturer_id', req.user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Nalog nije pronađen' })
        return
      }
      throw error
    }

    res.json({
      success: true,
      order: data,
      message: 'Nalog za šivenje je pokrenut'
    })
  } catch (error) {
    console.error('[Manufacturer] Error starting order:', error)
    next(error)
  }
})

/**
 * PATCH /api/manufacturer/sewing-orders/:id/complete
 * Završava nalog za šivenje
 * Očekuje: { proof_document_url } (opciono)
 */
router.patch('/sewing-orders/:id/complete', requireAuth, requireRole(['proizvodjac']), async (req, res, next) => {
  try {
    const { id } = req.params
    const { proof_document_url } = req.body

    const { data, error } = await adminSupabase
      .from('sewing_orders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        proof_document_url: proof_document_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('manufacturer_id', req.user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Nalog nije pronađen' })
        return
      }
      throw error
    }

    res.json({
      success: true,
      order: data,
      message: 'Nalog za šivenje je završen'
    })
  } catch (error) {
    console.error('[Manufacturer] Error completing order:', error)
    next(error)
  }
})

export default router
