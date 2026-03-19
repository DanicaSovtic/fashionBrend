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

// Pomoćne funkcije za normalizaciju naziva materijala/boje pri poređenju sa zalihama
const normalizeMaterialName = (name) => {
  if (!name) return ''
  const lower = name.toLowerCase().trim()
  // Ukloni sve od prve cifre ili znaka % nadalje (procenti, gramaže)
  const match = lower.match(/^[^0-9%]+/)
  return (match ? match[0] : lower).trim()
}

const normalizeColorName = (color) => {
  if (!color) return ''
  return color.toLowerCase().trim()
}

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
        color_palette,
        media:product_model_media!product_model_media_model_id_fkey(image_url, label, is_primary),
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

const RSD_RATE = Number(process.env.RSD_RATE) || 118
const ETH_PER_USD_TESTNET = 0.0005
function rsdToWeiBackend (totalRsd) {
  const usd = totalRsd / RSD_RATE
  const eth = usd * ETH_PER_USD_TESTNET
  return BigInt(Math.floor(eth * 1e18))
}

/**
 * POST /api/designer/material-requests/bundle
 * Kreira jedan logički zahtev (bundle) sa više materijala – jedan requestId za ugovor.
 * Body: { product_model_id, supplier_id, deadline, notes,
 *          materials: [{ material, color, quantity_kg, quantity_unit?, quantity_m? }] }
 */
router.post('/bundle', requireAuth, requireRole(['modni_dizajner']), async (req, res, next) => {
  try {
    const { product_model_id, supplier_id, deadline, notes, materials } = req.body

    if (!supplier_id || !materials || !Array.isArray(materials) || materials.length === 0) {
      res.status(400).json({
        error: 'supplier_id i materials (niz sa bar jednim { material, color, quantity_kg }) su obavezni'
      })
      return
    }

    for (const m of materials) {
      if (!m.material || !m.color || m.quantity_kg == null) {
        res.status(400).json({
          error: 'Svaka stavka u materials mora imati material, color i quantity_kg'
        })
        return
      }
    }

    const { data: supplierProfile, error: supplierError } = await adminSupabase
      .from('profiles')
      .select('user_id, full_name, wallet_address')
      .eq('user_id', supplier_id)
      .single()

    if (supplierError || !supplierProfile) {
      res.status(400).json({ error: 'Dobavljač nije pronađen' })
      return
    }

    if (!supplierProfile.wallet_address || !supplierProfile.wallet_address.trim()) {
      res.status(400).json({
        error: 'Dobavljač nije postavio Ethereum adresu (wallet). Molimo kontaktirajte dobavljača.'
      })
      return
    }

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

    let totalPriceRsd = 0
    const materialsWithPrice = []
    const normalizedMaterials = materials.map((m) => {
      const unit = (m.quantity_unit && String(m.quantity_unit).toLowerCase().trim()) === 'm' ? 'm' : 'kg'
      const qtyNumber = parseFloat(m.quantity_kg)
      return {
        ...m,
        quantity_kg: qtyNumber,
        quantity_unit: unit,
        quantity_m: unit === 'm' ? qtyNumber : (m.quantity_m != null ? parseFloat(m.quantity_m) : null)
      }
    })

    for (const m of normalizedMaterials) {
      const materialName = (m.material || '').trim()
      const colorName = (m.color || '').trim()
      const normMaterial = normalizeMaterialName(materialName)
      const normColor = normalizeColorName(colorName)

      const { data: invRows } = await adminSupabase
        .from('inventory_items')
        .select('id, material, color, quantity_kg, price_per_kg')
        .eq('supplier_id', supplier_id)
        .eq('status', 'active')
        // case-insensitive i tolerantno na razlike tipa "Lan 95%" vs "Lan"
        .ilike('material', `%${normMaterial}%`)
        .ilike('color', `%${normColor}%`)

      const totalAvailable = (invRows || []).reduce((s, r) => s + (Number(r.quantity_kg) || 0), 0)
      const qty = m.quantity_kg
      if (totalAvailable < qty) {
        res.status(400).json({
          error: `Nedovoljno zaliha kod dobavljača za ${materialName} / ${colorName}. Dostupno: ${totalAvailable} kg, traženo: ${qty} kg`
        })
        return
      }
      const pricePerKg = invRows?.[0]?.price_per_kg != null ? parseFloat(invRows[0].price_per_kg) : 0
      const lineTotal = qty * pricePerKg
      totalPriceRsd += lineTotal
      materialsWithPrice.push({
        material: materialName,
        color: colorName,
        quantity_kg: qty,
        quantity_unit: m.quantity_unit,
        quantity_m: m.quantity_m,
        price_per_kg: pricePerKg,
        line_total_rsd: lineTotal
      })
    }

    const bundleId = crypto.randomUUID()
    const now = new Date().toISOString()
    const rows = materialsWithPrice.map((m) => ({
      request_bundle_id: bundleId,
      product_model_id: product_model_id || null,
      collection_id: collectionId,
      requested_by: req.user.id,
      supplier_id,
      model_name: modelName,
      model_sku: modelSku,
      material: m.material,
      color: m.color,
      quantity_kg: m.quantity_kg,
      quantity_unit: m.quantity_unit || 'kg',
      quantity_m: m.quantity_m ?? null,
      deadline: deadline || null,
      notes: notes || null,
      status: 'new',
      created_at: now,
      updated_at: now
    }))

    const { data: inserted, error: insertError } = await adminSupabase
      .from('material_requests')
      .insert(rows)
      .select()

    if (insertError) {
      if (insertError.code === '42P01') {
        res.status(500).json({
          error: 'Tabela material_requests ne postoji. Pokreni migraciju: create_supplier_tables.sql i add_designer_supplier_contract_fields.sql'
        })
        return
      }
      throw insertError
    }

    if (product_model_id) {
      await adminSupabase
        .from('product_models')
        .update({ development_stage: 'development', updated_at: now })
        .eq('id', product_model_id)
    }

    const totalPriceWei = rsdToWeiBackend(totalPriceRsd)

    res.json({
      success: true,
      bundle_id: bundleId,
      requests: inserted,
      materials: materialsWithPrice.map((m) => ({
        materialName: m.material,
        color: m.color,
        quantity_kg: m.quantity_kg,
        price_per_kg: m.price_per_kg,
        line_total_rsd: m.line_total_rsd
      })),
      total_price_rsd: totalPriceRsd,
      total_price_wei: totalPriceWei.toString(),
      supplier_wallet: supplierProfile.wallet_address.trim(),
      message: 'Bundle zahteva je kreiran. Sledeći korak: createRequest + fundRequest na blockchainu (MetaMask).'
    })
  } catch (error) {
    console.error('[DesignerMaterialRequests] Error creating bundle:', error)
    next(error)
  }
})

/**
 * GET /api/designer/material-requests/bundle/:bundleId
 */
router.get('/bundle/:bundleId', requireAuth, requireRole(['modni_dizajner']), async (req, res, next) => {
  try {
    const { bundleId } = req.params

    const { data: rows, error } = await adminSupabase
      .from('material_requests')
      .select(`
        *,
        supplier_profile:profiles!material_requests_supplier_id_fkey(full_name, wallet_address),
        product_model:product_models(name, sku, materials),
        collection:collections(name, season)
      `)
      .eq('request_bundle_id', bundleId)
      .eq('requested_by', req.user.id)

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Bundle nije pronađen' })
        return
      }
      throw error
    }

    if (!rows || rows.length === 0) {
      res.status(404).json({ error: 'Bundle nije pronađen' })
      return
    }

    res.json({
      bundle_id: bundleId,
      requests: rows,
      contract_address: rows[0]?.contract_address || null,
      contract_request_id_hex: rows[0]?.contract_request_id_hex || null,
      fund_tx_hash: rows[0]?.fund_tx_hash || null
    })
  } catch (error) {
    console.error('[DesignerMaterialRequests] Error fetching bundle:', error)
    next(error)
  }
})

/**
 * POST /api/designer/material-requests/bundle/:bundleId/confirm-funded
 * Body: { contract_address, request_id_hex, tx_hash_fund }
 */
router.post('/bundle/:bundleId/confirm-funded', requireAuth, requireRole(['modni_dizajner']), async (req, res, next) => {
  try {
    const { bundleId } = req.params
    const { contract_address, request_id_hex, tx_hash_fund } = req.body

    if (!contract_address || !request_id_hex || !tx_hash_fund) {
      res.status(400).json({
        error: 'contract_address, request_id_hex i tx_hash_fund su obavezni'
      })
      return
    }

    const { data: rows, error: fetchError } = await adminSupabase
      .from('material_requests')
      .select('id')
      .eq('request_bundle_id', bundleId)
      .eq('requested_by', req.user.id)

    if (fetchError || !rows || rows.length === 0) {
      res.status(404).json({ error: 'Bundle nije pronađen' })
      return
    }

    const { error: updateError } = await adminSupabase
      .from('material_requests')
      .update({
        contract_address: contract_address.trim(),
        contract_request_id_hex: request_id_hex,
        fund_tx_hash: tx_hash_fund,
        updated_at: new Date().toISOString()
      })
      .eq('request_bundle_id', bundleId)

    if (updateError) throw updateError

    res.json({
      success: true,
      message: 'Depozit je zabeležen. Dobavljač može prihvatiti zahtev na blockchainu.'
    })
  } catch (error) {
    console.error('[DesignerMaterialRequests] Error confirm-funded:', error)
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
    let productModelId = null

    const { data: viewRows, error: viewError } = await adminSupabase
      .from('completed_products_from_manufacturer')
      .select('product_model_id')
      .eq('sewing_order_id', sewing_order_id)
      .eq('designer_id', req.user.id)
      .limit(1)

    if (!viewError && viewRows?.length > 0 && viewRows[0]?.product_model_id) {
      productModelId = viewRows[0].product_model_id
    }

    if (!productModelId) {
      const { data: orderRow, error: orderError } = await adminSupabase
        .from('sewing_orders')
        .select('product_model_id, collection_id')
        .eq('id', sewing_order_id)
        .eq('status', 'completed')
        .single()
      if (!orderError && orderRow?.product_model_id) {
        const { data: col } = await adminSupabase
          .from('collections')
          .select('created_by')
          .eq('id', orderRow.collection_id)
          .single()
        if (col?.created_by === req.user.id) productModelId = orderRow.product_model_id
      }
    }

    if (!productModelId) {
      res.status(404).json({
        error: 'Završeni proizvod nije pronađen ili ne pripada vama',
        details: viewError ? viewError.message : undefined
      })
      return
    }

    const { error: updateError } = await adminSupabase
      .from('product_models')
      .update({ development_stage: 'testing', updated_at: new Date().toISOString() })
      .eq('id', productModelId)

    if (updateError) {
      console.error('[DesignerMaterialRequests] approve-for-testing update product_models:', updateError)
      res.status(500).json({
        error: 'Greška pri ažuriranju faze proizvoda',
        details: updateError.message
      })
      return
    }

    res.json({ success: true, message: 'Proizvod je pušten na testiranje – laborant i tester kvaliteta će ga odobriti.' })
  } catch (error) {
    console.error('[DesignerMaterialRequests] Error approve-for-testing:', error)
    res.status(500).json({
      error: error.message || 'Greška pri puštanju na testiranje',
      details: error.details || error.code
    })
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
