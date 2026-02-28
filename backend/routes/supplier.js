/**
 * Supplier router - za dobavljača materijala
 * Montira se na /api/supplier
 */
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { createAdminClient } from '../services/supabaseClient.js'
import { parseMaterials } from '../utils/materialParser.js'

const router = Router()
const adminSupabase = createAdminClient()

/**
 * GET /api/supplier/inventory
 * Dobija listu zaliha dobavljača
 */
router.get('/inventory', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { data, error } = await adminSupabase
      .from('inventory_items')
      .select('*')
      .eq('supplier_id', req.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') {
        res.json({
          inventory: [],
          message: 'Tabela inventory_items ne postoji. Pokreni migraciju: create_supplier_tables.sql'
        })
        return
      }
      throw error
    }

    const items = data || []
    if (items.length === 0) {
      res.json({ inventory: [], count: 0 })
      return
    }

    // Ukupno poslato po (materijal, boja) iz material_shipments – da bi "dostupno" bilo realna brojka
    const { data: shipments } = await adminSupabase
      .from('material_shipments')
      .select('material, color, quantity_sent_kg')
      .eq('supplier_id', req.user.id)

    const sentByKey = {}
    for (const row of shipments || []) {
      const key = `${row.material}|${row.color}`
      sentByKey[key] = (sentByKey[key] || 0) + (Number(row.quantity_sent_kg) || 0)
    }

    // Po (materijal, boja): zbir u inventaru i dostupno = zbir - poslato
    const invByKey = {}
    for (const row of items) {
      const key = `${row.material}|${row.color}`
      invByKey[key] = (invByKey[key] || 0) + (Number(row.quantity_kg) || 0)
    }
    const availableByKey = {}
    for (const key of Object.keys(invByKey)) {
      availableByKey[key] = Math.max(0, (invByKey[key] || 0) - (sentByKey[key] || 0))
    }
    const inventoryWithAvailable = items.map((item) => {
      const key = `${item.material}|${item.color}`
      return { ...item, available_kg: availableByKey[key] ?? (Number(item.quantity_kg) || 0) }
    })

    res.json({
      inventory: inventoryWithAvailable,
      count: inventoryWithAvailable.length
    })
  } catch (error) {
    console.error('[Supplier] Error fetching inventory:', error)
    next(error)
  }
})

/**
 * POST /api/supplier/inventory
 * Dodaje novu zalihu
 * Očekuje: { material, color, quantity_kg, price_per_kg }
 */
router.post('/inventory', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { material, color, quantity_kg, price_per_kg, blockchain_tx_hash, blockchain_item_id } = req.body

    if (!material || !color || quantity_kg === undefined) {
      res.status(400).json({ 
        error: 'material, color i quantity_kg su obavezni' 
      })
      return
    }

    const { data, error } = await adminSupabase
      .from('inventory_items')
      .insert({
        supplier_id: req.user.id,
        material,
        color,
        quantity_kg: parseFloat(quantity_kg),
        price_per_kg: price_per_kg ? parseFloat(price_per_kg) : null,
        blockchain_tx_hash: blockchain_tx_hash || null,
        blockchain_item_id: blockchain_item_id || null,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      if (error.code === '42P01') {
        res.status(500).json({
          error: 'Tabela inventory_items ne postoji. Pokreni migraciju: create_supplier_tables.sql'
        })
        return
      }
      throw error
    }

    res.json({
      success: true,
      item: data,
      message: 'Zaliha je uspešno dodata'
    })
  } catch (error) {
    console.error('[Supplier] Error adding inventory item:', error)
    next(error)
  }
})

/**
 * PATCH /api/supplier/inventory/:id
 * Ažurira zalihu (najčešće količinu)
 * Očekuje: { quantity_kg, price_per_kg, status, blockchain_tx_hash }
 */
router.patch('/inventory/:id', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { id } = req.params
    const { quantity_kg, price_per_kg, status, blockchain_tx_hash } = req.body

    // Proveri da li stavka pripada dobavljaču
    const { data: existingItem, error: fetchError } = await adminSupabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .eq('supplier_id', req.user.id)
      .single()

    if (fetchError || !existingItem) {
      res.status(404).json({ error: 'Zaliha nije pronađena' })
      return
    }

    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (quantity_kg !== undefined) updateData.quantity_kg = parseFloat(quantity_kg)
    if (price_per_kg !== undefined) updateData.price_per_kg = price_per_kg ? parseFloat(price_per_kg) : null
    if (status !== undefined) updateData.status = status
    if (blockchain_tx_hash !== undefined) updateData.blockchain_tx_hash = blockchain_tx_hash

    const { data, error } = await adminSupabase
      .from('inventory_items')
      .update(updateData)
      .eq('id', id)
      .eq('supplier_id', req.user.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    res.json({
      success: true,
      item: data,
      message: 'Zaliha je uspešno ažurirana'
    })
  } catch (error) {
    console.error('[Supplier] Error updating inventory item:', error)
    next(error)
  }
})

/**
 * GET /api/supplier/requests
 * Dobija listu zahteva za dobavljača
 * Query params: status, collection_id, search
 */
router.get('/requests', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { status, collection_id, search } = req.query

    let query = adminSupabase
      .from('material_requests')
      .select(`
        *,
        requested_by_profile:profiles!material_requests_requested_by_fkey(full_name, role),
        product_model:product_models(name, sku),
        collection:collections(name, season)
      `)
      .eq('supplier_id', req.user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (collection_id) {
      query = query.eq('collection_id', collection_id)
    }

    if (search) {
      query = query.or(`model_name.ilike.%${search}%,model_sku.ilike.%${search}%,material.ilike.%${search}%`)
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

    // Izračunaj KPI-ove: grupisano po bundle-u (jedan grupni zahtev = jedan broj)
    const countUniqueRequests = (rows, statusFilter) => {
      const byStatus = (rows || []).filter(r => r.status === statusFilter)
      const groupKeys = new Set(byStatus.map(r => r.request_bundle_id || r.id))
      return groupKeys.size
    }
    const kpis = {
      new: countUniqueRequests(data, 'new'),
      in_progress: countUniqueRequests(data, 'in_progress'),
      sent: countUniqueRequests(data, 'sent'),
      completed: countUniqueRequests(data, 'completed')
    }

    res.json({
      requests: data || [],
      count: data?.length || 0,
      kpis
    })
  } catch (error) {
    console.error('[Supplier] Error fetching requests:', error)
    next(error)
  }
})

/**
 * GET /api/supplier/requests/bundle/:bundleId
 * Detalji bundle-a (svi redovi + contract_address za blockchain prihvatanje)
 */
router.get('/requests/bundle/:bundleId', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { bundleId } = req.params
    const { data: rows, error } = await adminSupabase
      .from('material_requests')
      .select(`
        *,
        requested_by_profile:profiles!material_requests_requested_by_fkey(full_name, role),
        product_model:product_models(name, sku),
        collection:collections(name, season)
      `)
      .eq('request_bundle_id', bundleId)
      .eq('supplier_id', req.user.id)
    if (error || !rows || rows.length === 0) {
      res.status(404).json({ error: 'Bundle nije pronađen' })
      return
    }

    // Za svaki red u bundle-u: dostupna količina (zbir zaliha − poslato) i da li ima dovoljno
    const requestsWithAvailability = await Promise.all(rows.map(async (r) => {
      const { data: inventoryRows } = await adminSupabase
        .from('inventory_items')
        .select('quantity_kg, price_per_kg')
        .eq('supplier_id', req.user.id)
        .eq('status', 'active')
        .ilike('material', `%${String(r.material || '').toLowerCase()}%`)
        .ilike('color', `%${String(r.color || '').toLowerCase()}%`)

      const totalInInventory = (inventoryRows || []).reduce((sum, row) => sum + (Number(row.quantity_kg) || 0), 0)

      const { data: shipments } = await adminSupabase
        .from('material_shipments')
        .select('quantity_sent_kg')
        .eq('supplier_id', req.user.id)
        .ilike('material', `%${String(r.material || '').toLowerCase()}%`)
        .ilike('color', `%${String(r.color || '').toLowerCase()}%`)

      const totalSent = (shipments || []).reduce((sum, row) => sum + (Number(row.quantity_sent_kg) || 0), 0)
      const totalAvailable = Math.max(0, totalInInventory - totalSent)
      const available_inventory = totalAvailable >= 0
        ? { quantity_kg: totalAvailable, price_per_kg: inventoryRows?.[0]?.price_per_kg }
        : null
      const has_enough = totalAvailable >= (r.quantity_kg || 0)
      return { ...r, available_inventory, has_enough }
    }))

    const bundle_has_enough = requestsWithAvailability.every(r => r.has_enough)
    const first = requestsWithAvailability[0]
    const request = first ? {
      ...first,
      model_name: first.product_model?.name || first.model_name,
      model_sku: first.product_model?.sku || first.model_sku
    } : null

    res.json({
      bundle_id: bundleId,
      requests: requestsWithAvailability,
      request,
      contract_address: first?.contract_address || null,
      contract_request_id_hex: first?.contract_request_id_hex || null,
      fund_tx_hash: first?.fund_tx_hash || null,
      available_inventory: first?.available_inventory ?? null,
      has_enough: bundle_has_enough,
      bundle_has_enough
    })
  } catch (error) {
    console.error('[Supplier] Error fetching bundle:', error)
    next(error)
  }
})

/**
 * GET /api/supplier/requests/:id
 * Dobija detalje zahteva
 */
router.get('/requests/:id', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { id } = req.params

    const { data, error } = await adminSupabase
      .from('material_requests')
      .select(`
        *,
        requested_by_profile:profiles!material_requests_requested_by_fkey(full_name, role),
        product_model:product_models(name, sku, materials),
        collection:collections(name, season)
      `)
      .eq('id', id)
      .eq('supplier_id', req.user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Zahtev nije pronađen' })
        return
      }
      throw error
    }

    // Realna dostupna količina: zbir zaliha minus sve što je već poslato (iz baze)
    const { data: inventoryRows } = await adminSupabase
      .from('inventory_items')
      .select('quantity_kg, price_per_kg')
      .eq('supplier_id', req.user.id)
      .eq('status', 'active')
      .ilike('material', `%${String(data.material || '').toLowerCase()}%`)
      .ilike('color', `%${String(data.color || '').toLowerCase()}%`)

    const totalInInventory = (inventoryRows || []).reduce((sum, row) => sum + (Number(row.quantity_kg) || 0), 0)

    const { data: shipments } = await adminSupabase
      .from('material_shipments')
      .select('quantity_sent_kg')
      .eq('supplier_id', req.user.id)
      .ilike('material', `%${String(data.material || '').toLowerCase()}%`)
      .ilike('color', `%${String(data.color || '').toLowerCase()}%`)

    const totalSent = (shipments || []).reduce((sum, row) => sum + (Number(row.quantity_sent_kg) || 0), 0)
    const totalAvailable = Math.max(0, totalInInventory - totalSent)
    const available_inventory = totalAvailable >= 0
      ? { quantity_kg: totalAvailable, price_per_kg: inventoryRows?.[0]?.price_per_kg }
      : null

    res.json({
      request: data,
      available_inventory,
      has_enough: totalAvailable >= (data.quantity_kg || 0)
    })
  } catch (error) {
    console.error('[Supplier] Error fetching request details:', error)
    next(error)
  }
})

/**
 * POST /api/supplier/requests/bundle/:bundleId/confirm-accepted
 * Nakon acceptRequest na blockchainu: provera zaliha, umanjenje, status in_progress.
 * Body: { tx_hash }
 */
router.post('/requests/bundle/:bundleId/confirm-accepted', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { bundleId } = req.params
    const { tx_hash } = req.body

    if (!bundleId) {
      res.status(400).json({ error: 'bundleId je obavezan' })
      return
    }

    const { data: bundleRows, error: fetchErr } = await adminSupabase
      .from('material_requests')
      .select('id, material, color, quantity_kg')
      .eq('request_bundle_id', bundleId)
      .eq('supplier_id', req.user.id)

    if (fetchErr || !bundleRows || bundleRows.length === 0) {
      res.status(404).json({ error: 'Bundle nije pronađen ili vam ne pripada' })
      return
    }

    const byKey = {}
    for (const r of bundleRows) {
      const key = `${r.material}|${r.color}`
      byKey[key] = (byKey[key] || 0) + (parseFloat(r.quantity_kg) || 0)
    }

    for (const key of Object.keys(byKey)) {
      const [material, color] = key.split('|')
      const matNorm = String(material || '').toLowerCase()
      const colorNorm = String(color || '').toLowerCase()
      const required = byKey[key]
      const { data: invRows } = await adminSupabase
        .from('inventory_items')
        .select('id, quantity_kg')
        .eq('supplier_id', req.user.id)
        .eq('status', 'active')
        .ilike('material', `%${matNorm}%`)
        .ilike('color', `%${colorNorm}%`)
        .order('created_at', { ascending: true })
      const totalAvailable = (invRows || []).reduce((s, row) => s + (parseFloat(row.quantity_kg) || 0), 0)
      if (totalAvailable < required) {
        res.status(400).json({
          error: `Nedovoljno zaliha za ${material} / ${color}. Potrebno: ${required} kg, dostupno: ${totalAvailable} kg`
        })
        return
      }
    }

    for (const key of Object.keys(byKey)) {
      const [material, color] = key.split('|')
      const matNorm = String(material || '').toLowerCase()
      const colorNorm = String(color || '').toLowerCase()
      let remaining = byKey[key]
      const { data: invRows } = await adminSupabase
        .from('inventory_items')
        .select('id, quantity_kg')
        .eq('supplier_id', req.user.id)
        .eq('status', 'active')
        .ilike('material', `%${matNorm}%`)
        .ilike('color', `%${colorNorm}%`)
        .order('created_at', { ascending: true })
      for (const row of invRows || []) {
        if (remaining <= 0) break
        const qty = parseFloat(row.quantity_kg) || 0
        const subtract = Math.min(qty, remaining)
        const newQty = Math.max(0, qty - subtract)
        remaining -= subtract
        await adminSupabase
          .from('inventory_items')
          .update({ quantity_kg: newQty, updated_at: new Date().toISOString() })
          .eq('id', row.id)
      }
    }

    const { error: updateErr } = await adminSupabase
      .from('material_requests')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('request_bundle_id', bundleId)
      .eq('supplier_id', req.user.id)

    if (updateErr) throw updateErr

    res.json({
      success: true,
      message: 'Zahtev je prihvaćen i zalihe su umanjene.',
      tx_hash: tx_hash || null
    })
  } catch (error) {
    console.error('[Supplier] Error confirm-accepted:', error)
    next(error)
  }
})

/**
 * PATCH /api/supplier/requests/:id/accept
 * Prihvata zahtev (status -> in_progress)
 */
router.patch('/requests/:id/accept', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { id } = req.params

    const { data, error } = await adminSupabase
      .from('material_requests')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('supplier_id', req.user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Zahtev nije pronađen' })
        return
      }
      throw error
    }

    res.json({
      success: true,
      request: data,
      message: 'Zahtev je prihvaćen'
    })
  } catch (error) {
    console.error('[Supplier] Error accepting request:', error)
    next(error)
  }
})

/**
 * PATCH /api/supplier/requests/:id/reject
 * Odbija zahtev (status -> rejected)
 * Očekuje: { rejection_reason }
 */
router.patch('/requests/:id/reject', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { id } = req.params
    const { rejection_reason } = req.body

    if (!rejection_reason) {
      res.status(400).json({ error: 'rejection_reason je obavezan' })
      return
    }

    const { data, error } = await adminSupabase
      .from('material_requests')
      .update({
        status: 'rejected',
        rejection_reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('supplier_id', req.user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Zahtev nije pronađen' })
        return
      }
      throw error
    }

    res.json({
      success: true,
      request: data,
      message: 'Zahtev je odbijen'
    })
  } catch (error) {
    console.error('[Supplier] Error rejecting request:', error)
    next(error)
  }
})

/**
 * PATCH /api/supplier/requests/:id/prepare
 * Sačuva pripremu pošiljke (Korak 2)
 * Očekuje: { quantity_sent_kg, batch_lot_id, document_url }
 */
router.patch('/requests/:id/prepare', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { id } = req.params
    const { quantity_sent_kg, batch_lot_id, document_url } = req.body

    const { data, error } = await adminSupabase
      .from('material_requests')
      .update({
        quantity_sent_kg: quantity_sent_kg ? parseFloat(quantity_sent_kg) : null,
        batch_lot_id: batch_lot_id || null,
        document_url: document_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('supplier_id', req.user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Zahtev nije pronađen' })
        return
      }
      throw error
    }

    res.json({
      success: true,
      request: data,
      message: 'Priprema pošiljke je sačuvana'
    })
  } catch (error) {
    console.error('[Supplier] Error preparing shipment:', error)
    next(error)
  }
})

/**
 * PATCH /api/supplier/requests/:id/send
 * Označi kao poslato (Korak 3)
 * Očekuje: { shipping_date, tracking_number, manufacturer_address }
 */
router.patch('/requests/:id/send', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { id } = req.params
    const { shipping_date, tracking_number, manufacturer_address } = req.body

    const { data, error } = await adminSupabase
      .from('material_requests')
      .update({
        status: 'sent',
        shipping_date: shipping_date || new Date().toISOString().split('T')[0],
        tracking_number: tracking_number || null,
        manufacturer_address: manufacturer_address || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('supplier_id', req.user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Zahtev nije pronađen' })
        return
      }
      throw error
    }

    res.json({
      success: true,
      request: data,
      message: 'Pošiljka je označena kao poslata'
    })
  } catch (error) {
    console.error('[Supplier] Error marking as sent:', error)
    next(error)
  }
})

/**
 * PATCH /api/supplier/requests/:id/complete
 * Označi kao završeno
 */
router.patch('/requests/:id/complete', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { id } = req.params

    const { data, error } = await adminSupabase
      .from('material_requests')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('supplier_id', req.user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Zahtev nije pronađen' })
        return
      }
      throw error
    }

    res.json({
      success: true,
      request: data,
      message: 'Zahtev je označen kao završen'
    })
  } catch (error) {
    console.error('[Supplier] Error completing request:', error)
    next(error)
  }
})

/**
 * GET /api/supplier/requests/:id/messages
 * Dobija poruke za zahtev
 */
router.get('/requests/:id/messages', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { id } = req.params

    // Proveri da li zahtev pripada dobavljaču
    const { data: request } = await adminSupabase
      .from('material_requests')
      .select('id')
      .eq('id', id)
      .eq('supplier_id', req.user.id)
      .single()

    if (!request) {
      res.status(404).json({ error: 'Zahtev nije pronađen' })
      return
    }

    const { data, error } = await adminSupabase
      .from('request_messages')
      .select(`
        *,
        author_profile:profiles!request_messages_author_id_fkey(full_name, role)
      `)
      .eq('request_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      if (error.code === '42P01') {
        res.json({
          messages: [],
          message: 'Tabela request_messages ne postoji. Pokreni migraciju: create_supplier_tables.sql'
        })
        return
      }
      throw error
    }

    res.json({
      messages: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('[Supplier] Error fetching messages:', error)
    next(error)
  }
})

/**
 * POST /api/supplier/requests/:id/messages
 * Dodaje poruku za zahtev
 * Očekuje: { body }
 */
router.post('/requests/:id/messages', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { id } = req.params
    const { body } = req.body

    if (!body || !body.trim()) {
      res.status(400).json({ error: 'body je obavezan' })
      return
    }

    // Proveri da li zahtev pripada dobavljaču
    const { data: request } = await adminSupabase
      .from('material_requests')
      .select('id')
      .eq('id', id)
      .eq('supplier_id', req.user.id)
      .single()

    if (!request) {
      res.status(404).json({ error: 'Zahtev nije pronađen' })
      return
    }

    const { data, error } = await adminSupabase
      .from('request_messages')
      .insert({
        request_id: id,
        author_id: req.user.id,
        author_name: req.profile?.full_name || 'Dobavljač',
        author_role: req.profile?.role || 'dobavljac_materijala',
        body: body.trim()
      })
      .select()
      .single()

    if (error) {
      if (error.code === '42P01') {
        res.status(500).json({
          error: 'Tabela request_messages ne postoji. Pokreni migraciju: create_supplier_tables.sql'
        })
        return
      }
      throw error
    }

    res.json({
      success: true,
      message: data,
      message_text: 'Poruka je uspešno poslata'
    })
  } catch (error) {
    console.error('[Supplier] Error adding message:', error)
    next(error)
  }
})

/**
 * POST /api/supplier/requests/:id/send-to-manufacturer
 * Šalje materijal proizvođaču
 * Očekuje: { manufacturer_id, quantity_sent_kg, shipping_date, tracking_number }
 */
router.post('/requests/:id/send-to-manufacturer', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { id } = req.params
    const { manufacturer_id, quantity_sent_kg, shipping_date, tracking_number } = req.body

    if (!manufacturer_id) {
      res.status(400).json({ error: 'manufacturer_id je obavezan' })
      return
    }

    // Proveri da li zahtev pripada dobavljaču i da li je u statusu 'in_progress'
    const { data: request, error: requestError } = await adminSupabase
      .from('material_requests')
      .select('*')
      .eq('id', id)
      .eq('supplier_id', req.user.id)
      .eq('status', 'in_progress')
      .single()

    if (requestError || !request) {
      res.status(404).json({ error: 'Zahtev nije pronađen ili nije u statusu "U toku"' })
      return
    }

    // Proveri da li proizvođač postoji
    const { data: manufacturer } = await adminSupabase
      .from('profiles')
      .select('user_id, full_name, role')
      .eq('user_id', manufacturer_id)
      .eq('role', 'proizvodjac')
      .single()

    if (!manufacturer) {
      res.status(400).json({ error: 'Proizvođač nije pronađen' })
      return
    }

    // Kreiraj pošiljku
    const { data: shipment, error: shipmentError } = await adminSupabase
      .from('material_shipments')
      .insert({
        material_request_id: id,
        product_model_id: request.product_model_id,
        collection_id: request.collection_id,
        supplier_id: req.user.id,
        manufacturer_id: manufacturer_id,
        model_name: request.model_name,
        model_sku: request.model_sku,
        material: request.material,
        color: request.color,
        quantity_kg: request.quantity_kg,
        quantity_sent_kg: quantity_sent_kg ? parseFloat(quantity_sent_kg) : request.quantity_kg,
        shipping_date: shipping_date || new Date().toISOString().split('T')[0],
        tracking_number: tracking_number || null,
        status: 'sent_to_manufacturer'
      })
      .select()
      .single()

    if (shipmentError) {
      if (shipmentError.code === '42P01') {
        res.status(500).json({
          error: 'Tabela material_shipments ne postoji. Pokreni migraciju: add_manufacturer_tables.sql'
        })
        return
      }
      throw shipmentError
    }

    // Ažuriraj status zahteva na "sent" (poslato proizvođaču)
    await adminSupabase
      .from('material_requests')
      .update({
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    // Zalihe se ne umanjuju ovde – "dostupno" se računa kao sum(inventory) - sum(material_shipments)
    // tako da i ranije poslate pošiljke ulaze u obzir.

    res.json({
      success: true,
      shipment,
      message: 'Materijal je uspešno poslat proizvođaču'
    })
  } catch (error) {
    console.error('[Supplier] Error sending to manufacturer:', error)
    next(error)
  }
})

/**
 * POST /api/supplier/requests/bundle/:bundleId/send-to-manufacturer
 * Priprema podatke za createShipment na blockchainu (bundle = više materijala u jednoj pošiljci).
 * Body: { manufacturer_id, shipping_date, tracking_number }
 * Vraća: shipmentId (za frontend = bundleId), manufacturer_wallet, product_model_id, expectedMaterialNames, lines.
 */
router.post('/requests/bundle/:bundleId/send-to-manufacturer', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { bundleId } = req.params
    const { manufacturer_id, shipping_date, tracking_number } = req.body

    if (!manufacturer_id) {
      res.status(400).json({ error: 'manufacturer_id je obavezan' })
      return
    }

    const { data: rows, error: bundleError } = await adminSupabase
      .from('material_requests')
      .select('*')
      .eq('request_bundle_id', bundleId)
      .eq('supplier_id', req.user.id)
      .eq('status', 'in_progress')

    if (bundleError || !rows || rows.length === 0) {
      res.status(404).json({ error: 'Bundle nije pronađen ili nije u statusu U toku' })
      return
    }

    const { data: manufacturer } = await adminSupabase
      .from('profiles')
      .select('user_id, full_name, wallet_address')
      .eq('user_id', manufacturer_id)
      .eq('role', 'proizvodjac')
      .single()

    if (!manufacturer || !manufacturer.wallet_address) {
      res.status(400).json({ error: 'Proizvođač nije pronađen ili nema podešen wallet (wallet_address u profilu)' })
      return
    }

    const productModelId = rows[0].product_model_id
    const { data: model } = await adminSupabase
      .from('product_models')
      .select('materials')
      .eq('id', productModelId)
      .single()

    const expectedMaterialNames = (parseMaterials(model?.materials || '') || []).map((m) => (m.name || '').trim()).filter(Boolean)
    if (expectedMaterialNames.length === 0) {
      res.status(400).json({ error: 'Model proizvoda nema definisane materijale u skici (product_models.materials)' })
      return
    }

    const lines = rows.map((r) => ({
      material: r.material || '',
      color: r.color || '',
      quantityKg: Number(r.quantity_kg) || 0
    }))

    res.json({
      bundle_id: bundleId,
      manufacturer_wallet: manufacturer.wallet_address,
      product_model_id: productModelId,
      expectedMaterialNames,
      lines,
      shipping_date: shipping_date || new Date().toISOString().split('T')[0],
      tracking_number: tracking_number || null
    })
  } catch (error) {
    console.error('[Supplier] Error preparing send-to-manufacturer:', error)
    next(error)
  }
})

/**
 * POST /api/supplier/requests/bundle/:bundleId/confirm-shipment-sent
 * Nakon uspešnog createShipment na blockchainu: upis u material_shipments i status sent.
 * Body: { tx_hash, shipment_id_hex, manufacturer_id, shipping_date?, tracking_number? }
 */
router.post('/requests/bundle/:bundleId/confirm-shipment-sent', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    const { bundleId } = req.params
    const { tx_hash, shipment_id_hex, manufacturer_id, shipping_date, tracking_number } = req.body
    const contractAddress = process.env.SUPPLIER_MANUFACTURER_CONTRACT

    if (!contractAddress) {
      res.status(500).json({ error: 'SUPPLIER_MANUFACTURER_CONTRACT nije podešen u .env' })
      return
    }

    const { data: rows, error: bundleError } = await adminSupabase
      .from('material_requests')
      .select('*')
      .eq('request_bundle_id', bundleId)
      .eq('supplier_id', req.user.id)
      .eq('status', 'in_progress')

    if (bundleError || !rows || rows.length === 0) {
      res.status(404).json({ error: 'Bundle nije pronađen ili nije u statusu U toku' })
      return
    }

    if (!manufacturer_id) {
      res.status(400).json({ error: 'manufacturer_id je obavezan u body' })
      return
    }

    const shippingDate = shipping_date || new Date().toISOString().split('T')[0]

    const inserted = []
    for (const r of rows) {
      const { data: one, error: insertErr } = await adminSupabase.from('material_shipments').insert({
        material_request_id: r.id,
        product_model_id: r.product_model_id,
        collection_id: r.collection_id,
        supplier_id: req.user.id,
        manufacturer_id: manufacturer_id,
        model_name: r.model_name,
        model_sku: r.model_sku,
        material: r.material,
        color: r.color,
        quantity_kg: r.quantity_kg,
        quantity_sent_kg: r.quantity_kg,
        shipping_date: shippingDate,
        tracking_number: tracking_number || null,
        status: 'sent_to_manufacturer',
        contract_address: contractAddress,
        contract_shipment_id_hex: shipment_id_hex || null,
        shipment_bundle_id: bundleId
      }).select('id').single()

      if (insertErr) {
        console.error('[Supplier] confirm-shipment-sent insert error:', insertErr)
        res.status(500).json({
          error: 'Greška pri upisu pošiljke u bazu. Proveri da li je migracija add_supplier_manufacturer_contract_fields.sql pokrenuta i da li manufacturer_id postoji u profiles.',
          details: insertErr.message
        })
        return
      }
      inserted.push(one)
    }

    await adminSupabase
      .from('material_requests')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('request_bundle_id', bundleId)
      .eq('supplier_id', req.user.id)

    res.json({
      success: true,
      message: 'Pošiljka je zabeležena. Proizvođač može da prihvati na blockchainu.'
    })
  } catch (error) {
    console.error('[Supplier] Error confirming shipment sent:', error)
    next(error)
  }
})

/**
 * GET /api/supplier/manufacturers
 * Dobija listu proizvođača
 */
router.get('/manufacturers', requireAuth, requireRole(['dobavljac_materijala']), async (req, res, next) => {
  try {
    console.log('[Supplier] Fetching manufacturers...')
    console.log('[Supplier] User ID:', req.user?.id)
    
    // Prvo proveri sve profile da vidimo šta imamo
    const { data: allProfiles, error: allError } = await adminSupabase
      .from('profiles')
      .select('user_id, full_name, role')
      .order('full_name', { ascending: true })
    
    console.log('[Supplier] All profiles:', allProfiles)
    console.log('[Supplier] Profiles with proizvodjac role:', allProfiles?.filter(p => p.role === 'proizvodjac'))
    
    // Koristi adminSupabase da zaobiđe RLS policies
    // Pokušaj sa različitim varijantama role-a
    const { data: data1, error: error1 } = await adminSupabase
      .from('profiles')
      .select('user_id, full_name, role, wallet_address')
      .eq('role', 'proizvodjac')
      .order('full_name', { ascending: true })
    
    // Ako nema rezultata, probaj sa case-insensitive pretragom
    let data = data1
    let error = error1
    
    if (!data || data.length === 0) {
      console.log('[Supplier] No results with exact match, trying case-insensitive...')
      const { data: data2, error: error2 } = await adminSupabase
        .from('profiles')
        .select('user_id, full_name, role, wallet_address')
        .order('full_name', { ascending: true })
      
      if (!error2 && data2) {
        // Filtriraj ručno
        data = data2.filter(p => p.role && p.role.toLowerCase().trim() === 'proizvodjac')
        console.log('[Supplier] Filtered results:', data)
      }
    }

    console.log('[Supplier] Manufacturers query result:', { data, error, count: data?.length || 0 })

    if (error) {
      console.error('[Supplier] Error in query:', error)
      throw error
    }

    res.json({
      manufacturers: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('[Supplier] Error fetching manufacturers:', error)
    next(error)
  }
})

export default router
