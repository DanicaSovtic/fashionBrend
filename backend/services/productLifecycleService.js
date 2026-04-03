import { supabase, createAdminClient } from './supabaseClient.js'

const BLOCKCHAIN_EXPLORER_URL = process.env.BLOCKCHAIN_EXPLORER_URL || 'https://sepolia.etherscan.io'

const STEP_LABELS = {
  idea: 'Kreiranje ideje i modela',
  development: 'Razvoj i odobrenje za proizvodnju',
  material_request: 'Zahtev za materijal',
  material_confirmed: 'Potvrda i isporuka materijala',
  production_started: 'Početak proizvodnje',
  production_completed: 'Završena proizvodnja',
  quality_control: 'Kontrola kvaliteta',
  approval: 'Odobrenje (krojevi / materijali)',
  packaged: 'Pakovanje',
  added_to_shop: 'Dodato u prodavnicu'
}

const ROLE_LABELS = {
  modni_dizajner: 'Modni dizajner',
  dobavljac_materijala: 'Dobavljač materijala',
  proizvodjac: 'Proizvođač',
  laborant: 'Laborant',
  tester_kvaliteta: 'Tester kvaliteta',
  superadmin: 'Administrator'
}

/**
 * Vraća životni ciklus i digitalni identitet za proizvod.
 * Gradi detaljan timeline iz svih dostupnih tabel (dizajner, dobavljač, proizvođač, tačna vremena).
 */
export async function getProductLifecycle(productId) {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select(`
      id,
      title,
      sku,
      digital_id,
      authenticity_status,
      created_at,
      product_model_id,
      product_model:product_models(
        id,
        name,
        sku,
        concept,
        materials,
        created_at,
        updated_at,
        development_stage,
        collection_id
      )
    `)
    .eq('id', productId)
    .maybeSingle()

  if (productError) throw productError
  if (!product) return null

  const model = product.product_model
  if (product.product_model_id && model && model.development_stage !== 'approved') {
    return null
  }

  const digitalIdentity = {
    productId: product.id,
    digitalId: product.digital_id || product.sku || product.id,
    authenticityStatus: product.authenticity_status || 'verified',
    modelName: model?.name || product.title,
    modelSku: model?.sku || product.sku
  }

  let events = []

  if (product.product_model_id) {
    events = await buildRichLifecycle(product)
    if (events.length === 0) {
      events = buildSyntheticLifecycle(product, model)
    }
  }

  return {
    digitalIdentity,
    events,
    hasLifecycle: events.length > 0
  }
}

async function buildRichLifecycle(product) {
  const modelId = product.product_model_id
  const events = []

  // Admin klijent da lifecycle vidi sve podatke (material_shipments, sewing_orders, lab_test_results)
  // bez obzira na RLS – prikazuju se laborant, tester, dobavljač, proizvođač.
  const admin = createAdminClient()

  const [modelRes, collectionRes, versionsRes, approvalsRes, matReqRes, matShipRes, sewingRes, labRes] = await Promise.all([
    admin.from('product_models').select('created_at, updated_at').eq('id', modelId).maybeSingle(),
    admin.from('collections').select('created_by').eq('id', product.product_model?.collection_id).maybeSingle(),
    admin.from('product_model_versions').select('created_by, created_at, change_summary, version_number').eq('model_id', modelId).order('created_at', { ascending: true }),
    admin.from('product_model_approvals').select('approved_by, approval_item, status, updated_at, note').eq('model_id', modelId).order('updated_at', { ascending: true }),
    admin.from('material_requests').select('requested_by, supplier_id, created_at, updated_at, material, color, quantity_kg, contract_request_id_hex, fund_tx_hash').eq('product_model_id', modelId).order('created_at', { ascending: true }),
    admin.from('material_shipments').select('supplier_id, manufacturer_id, confirmed_at, received_at, material, color, contract_shipment_id_hex').eq('product_model_id', modelId).order('confirmed_at', { ascending: false }),
    admin.from('sewing_orders').select('manufacturer_id, started_at, completed_at, notes, quantity_pieces, contract_completion_id_hex').eq('product_model_id', modelId).order('completed_at', { ascending: false }),
    admin.from('lab_test_results').select('tested_by, lab_name, created_at, material_name, percentage').eq('product_model_id', modelId).order('created_at', { ascending: true })
  ])

  const model = modelRes.data
  const collection = collectionRes.data
  const versions = versionsRes.data || []
  const approvals = approvalsRes.data || []
  const matReqs = matReqRes.data || []
  const matShips = matShipRes.data || []
  const sewing = sewingRes.data || []
  const labTests = labRes.data || []

  const userIds = new Set()
  if (collection?.created_by) userIds.add(collection.created_by)
  versions.forEach((v) => { if (v.created_by) userIds.add(v.created_by) })
  approvals.forEach((a) => { if (a.approved_by) userIds.add(a.approved_by) })
  matReqs.forEach((r) => {
    if (r.requested_by) userIds.add(r.requested_by)
    if (r.supplier_id) userIds.add(r.supplier_id)
  })
  matShips.forEach((s) => {
    if (s.supplier_id) userIds.add(s.supplier_id)
    if (s.manufacturer_id) userIds.add(s.manufacturer_id)
  })
  sewing.forEach((s) => { if (s.manufacturer_id) userIds.add(s.manufacturer_id) })
  labTests.forEach((l) => { if (l.tested_by) userIds.add(l.tested_by) })

  const profileMap = {}
  if (userIds.size > 0) {
    try {
      const client = createAdminClient()
      const { data: profiles } = await client
        .from('profiles')
        .select('user_id, full_name, role')
        .in('user_id', [...userIds])
      ;(profiles || []).forEach((p) => {
        profileMap[p.user_id] = { name: p.full_name, roleLabel: ROLE_LABELS[p.role] || p.role }
      })
    } catch (_) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .in('user_id', [...userIds])
      ;(profiles || []).forEach((p) => {
        profileMap[p.user_id] = { name: p.full_name, roleLabel: ROLE_LABELS[p.role] || p.role }
      })
    }
  }

  const byDate = (a, b) => new Date(a.occurredAt) - new Date(b.occurredAt)

  if (model?.created_at) {
    const designerId = collection?.created_by
    const p = profileMap[designerId]
    events.push({
      id: `rich-idea-${modelId}`,
      stepKey: 'idea',
      label: STEP_LABELS.idea,
      occurredAt: model.created_at,
      description: 'Model kreiran i unet u sistem.',
      actorRole: p?.roleLabel || 'Modni dizajner',
      actorName: p?.name || null,
      extraDetail: null,
      details: { modelSku: product.product_model?.sku, modelName: product.product_model?.name },
      verifiedOnBlockchain: false
    })
  }

  versions.forEach((v, i) => {
    const p = profileMap[v.created_by]
    events.push({
      id: `rich-version-${modelId}-${i}`,
      stepKey: 'development',
      label: STEP_LABELS.development,
      occurredAt: v.created_at,
      description: v.change_summary || 'Izmena verzije modela.',
      actorRole: p?.roleLabel || 'Modni dizajner',
      actorName: p?.name || null,
      extraDetail: null,
      details: { version: v.version_number, changeSummary: v.change_summary },
      verifiedOnBlockchain: false
    })
  })

  approvals.filter((a) => a.status === 'approved' && a.updated_at).forEach((a) => {
    const p = profileMap[a.approved_by]
    const isTesterApproval = a.approval_item === 'Final Quality Approval'
    const productApprovalContract = process.env.PRODUCT_APPROVAL_CONTRACT || ''
    const hasContract = isTesterApproval && !!productApprovalContract
    events.push({
      id: `rich-approval-${a.approval_item}-${modelId}`,
      stepKey: 'approval',
      label: STEP_LABELS.approval,
      occurredAt: a.updated_at,
      description: `Odobreno: ${a.approval_item}.`,
      actorRole: p?.roleLabel || null,
      actorName: p?.name || null,
      extraDetail: a.note || null,
      details: { approvalItem: a.approval_item, note: a.note },
      verifiedOnBlockchain: hasContract,
      ...(hasContract && {
        blockchainContractAddress: productApprovalContract,
        blockchainContractName: 'Ugovor za odobrenje proizvoda (Tester kvaliteta)',
        blockchainTxHash: null,
        blockchainContractUrl: `${BLOCKCHAIN_EXPLORER_URL}/address/${productApprovalContract}`,
        blockchainTxUrl: null
      })
    })
  })

  matReqs.forEach((r) => {
    const designer = profileMap[r.requested_by]
    const supplier = profileMap[r.supplier_id]
    const hasContract = !!(r.contract_request_id_hex || r.fund_tx_hash)
    const contractAddress = process.env.DESIGNER_SUPPLIER_CONTRACT || ''
    events.push({
      id: `rich-matreq-${r.created_at}-${modelId}`,
      stepKey: 'material_request',
      label: STEP_LABELS.material_request,
      occurredAt: r.created_at,
      description: `Zahtev za materijal: ${r.material}${r.color ? `, ${r.color}` : ''} (${r.quantity_kg} kg).`,
      actorRole: designer?.roleLabel || 'Modni dizajner',
      actorName: designer?.name || null,
      extraDetail: supplier?.name ? `Dobavljač: ${supplier.name}` : null,
      details: { material: r.material, color: r.color, quantityKg: r.quantity_kg, supplier: supplier?.name },
      verifiedOnBlockchain: hasContract,
      ...(hasContract && contractAddress && {
        blockchainContractAddress: contractAddress,
        blockchainContractName: 'Ugovor Dizajner–Dobavljač',
        blockchainTxHash: r.fund_tx_hash || null,
        blockchainContractUrl: `${BLOCKCHAIN_EXPLORER_URL}/address/${contractAddress}`,
        blockchainTxUrl: r.fund_tx_hash ? `${BLOCKCHAIN_EXPLORER_URL}/tx/${r.fund_tx_hash}` : null
      })
    })
  })

  matShips.forEach((s) => {
    const supplier = profileMap[s.supplier_id]
    const manufacturer = profileMap[s.manufacturer_id]
    const at = s.confirmed_at || s.received_at
    if (!at) return
    const hasContract = !!s.contract_shipment_id_hex
    const contractAddress = process.env.SUPPLIER_MANUFACTURER_CONTRACT || ''
    events.push({
      id: `rich-matship-${s.confirmed_at || s.received_at}-${modelId}`,
      stepKey: 'material_confirmed',
      label: STEP_LABELS.material_confirmed,
      occurredAt: at,
      description: `Materijal isporučen: ${s.material}${s.color ? `, ${s.color}` : ''}.`,
      actorRole: supplier?.roleLabel || 'Dobavljač',
      actorName: supplier?.name || null,
      extraDetail: manufacturer?.name ? `Proizvođač (primalac): ${manufacturer.name}` : null,
      details: { material: s.material, color: s.color, supplier: supplier?.name, manufacturerReceiver: manufacturer?.name },
      verifiedOnBlockchain: hasContract,
      ...(hasContract && contractAddress && {
        blockchainContractAddress: contractAddress,
        blockchainContractName: 'Ugovor Dobavljač–Proizvođač',
        blockchainTxHash: null,
        blockchainContractUrl: `${BLOCKCHAIN_EXPLORER_URL}/address/${contractAddress}`,
        blockchainTxUrl: null
      })
    })
  })

  sewing.forEach((s) => {
    const manufacturer = profileMap[s.manufacturer_id]
    if (s.started_at) {
      events.push({
        id: `rich-sew-start-${modelId}`,
        stepKey: 'production_started',
        label: STEP_LABELS.production_started,
        occurredAt: s.started_at,
        description: s.notes || 'Započeta proizvodnja u radnji.',
        actorRole: manufacturer?.roleLabel || 'Proizvođač',
        actorName: manufacturer?.name || null,
        extraDetail: s.quantity_pieces ? `Komada: ${s.quantity_pieces}` : null,
        details: { manufacturer: manufacturer?.name, quantityPieces: s.quantity_pieces, notes: s.notes },
        verifiedOnBlockchain: false
      })
    }
    if (s.completed_at) {
      const hasContract = !!s.contract_completion_id_hex
      const contractAddress = process.env.DESIGNER_MANUFACTURER_CONTRACT || ''
      events.push({
        id: `rich-sew-done-${modelId}`,
        stepKey: 'production_completed',
        label: STEP_LABELS.production_completed,
        occurredAt: s.completed_at,
        description: 'Proizvodnja završena.',
        actorRole: manufacturer?.roleLabel || 'Proizvođač',
        actorName: manufacturer?.name || null,
        extraDetail: null,
        details: { manufacturer: manufacturer?.name },
        verifiedOnBlockchain: hasContract,
        ...(hasContract && contractAddress && {
          blockchainContractAddress: contractAddress,
          blockchainContractName: 'Ugovor Dizajner–Proizvođač',
          blockchainTxHash: null,
          blockchainContractUrl: `${BLOCKCHAIN_EXPLORER_URL}/address/${contractAddress}`,
          blockchainTxUrl: null
        })
      })
    }
  })

  labTests.forEach((l, i) => {
    const lab = profileMap[l.tested_by]
    events.push({
      id: `rich-lab-${modelId}-${i}`,
      stepKey: 'quality_control',
      label: STEP_LABELS.quality_control,
      occurredAt: l.created_at,
      description: `Laboratorijski test: ${l.material_name || 'materijal'}${l.percentage != null ? ` (${l.percentage}%)` : ''}. ${l.lab_name ? `Laboratorija: ${l.lab_name}.` : ''}`,
      actorRole: lab?.roleLabel || 'Laborant',
      actorName: lab?.name || null,
      extraDetail: null,
      details: { materialName: l.material_name, percentage: l.percentage, labName: l.lab_name, laborant: lab?.name },
      verifiedOnBlockchain: false
    })
  })

  const designerId = collection?.created_by
  const designerProfile = profileMap[designerId]

  events.push({
    id: `rich-shop-${product.id}`,
    stepKey: 'added_to_shop',
    label: STEP_LABELS.added_to_shop,
    occurredAt: product.created_at,
    description: 'Proizvod je dodat u prodavnicu i dostupan kupcima.',
    actorRole: designerProfile?.roleLabel || 'Modni dizajner',
    actorName: designerProfile?.name || null,
    extraDetail: null,
    details: { productSku: product.sku, productTitle: product.title },
    verifiedOnBlockchain: false
  })

  // Ako iz nekog razloga nemamo eksplicitne događaje za ključne faze,
  // dodaj sintetičke na osnovu postojećih podataka kako bi timeline bio potpun.
  const hasStep = (key) => events.some((e) => e.stepKey === key)

  const modelMeta = product.product_model || {}

  if (!hasStep('development') && (modelMeta.concept || modelMeta.materials)) {
    const occurredAt =
      (model && (model.updated_at || model.created_at)) || product.created_at || new Date().toISOString()
    events.push({
      id: `fallback-dev-${modelId}`,
      stepKey: 'development',
      label: STEP_LABELS.development,
      occurredAt,
      description: 'Početni koncept i izbor materijala.',
      actorRole: 'Modni dizajner',
      actorName: null,
      extraDetail: null,
      details: {
        concept: modelMeta.concept,
        materials: modelMeta.materials
      },
      verifiedOnBlockchain: false
    })
  }

  if (!hasStep('material_request') && matShips.length > 0) {
    const firstShip = [...matShips].sort((a, b) => {
      const da = new Date(a.created_at || a.shipping_date || a.confirmed_at || a.received_at || Date.now())
      const db = new Date(b.created_at || b.shipping_date || b.confirmed_at || b.received_at || Date.now())
      return da - db
    })[0]
    const supplier = profileMap[firstShip.supplier_id]
    events.push({
      id: `fallback-matreq-${modelId}`,
      stepKey: 'material_request',
      label: STEP_LABELS.material_request,
      occurredAt: firstShip.created_at || firstShip.shipping_date || firstShip.confirmed_at || firstShip.received_at,
      description: 'Zahtev za materijal kreiran i prosleđen dobavljaču.',
      actorRole: 'Modni dizajner',
      actorName: null,
      extraDetail: supplier?.name ? `Dobavljač: ${supplier.name}` : null,
      details: {
        material: firstShip.material,
        color: firstShip.color,
        supplier: supplier?.name
      },
      verifiedOnBlockchain: false
    })
  }

  if (!hasStep('production_started') && sewing.length > 0) {
    const firstOrder = [...sewing].sort((a, b) => {
      const da = new Date(a.started_at || a.completed_at || Date.now())
      const db = new Date(b.started_at || b.completed_at || Date.now())
      return da - db
    })[0]
    const manufacturer = profileMap[firstOrder.manufacturer_id]
    const occurredAt = firstOrder.started_at || firstOrder.completed_at
    if (occurredAt) {
      events.push({
        id: `fallback-prodstart-${modelId}`,
        stepKey: 'production_started',
        label: STEP_LABELS.production_started,
        occurredAt,
        description: 'Proizvodnja je započeta u radionici.',
        actorRole: manufacturer?.roleLabel || 'Proizvođač',
        actorName: manufacturer?.name || null,
        extraDetail: null,
        details: {
          manufacturer: manufacturer?.name,
          quantityPieces: firstOrder.quantity_pieces,
          notes: firstOrder.notes
        },
        verifiedOnBlockchain: false
      })
    }
  }

  events.sort(byDate)
  return dedupeByKey(events)
}

function dedupeByKey(events) {
  const seen = new Set()
  return events.filter((e) => {
    const key = `${e.stepKey}-${e.occurredAt}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildSyntheticLifecycle(product, model) {
  const events = []

  if (model?.created_at) {
    events.push({
      id: `synthetic-idea-${product.product_model_id}`,
      stepKey: 'idea',
      label: STEP_LABELS.idea,
      occurredAt: model.created_at,
      description: 'Model kreiran od strane modnog dizajnera.',
      actorRole: null,
      actorName: null,
      extraDetail: null,
      details: {},
      verifiedOnBlockchain: false
    })
  }

  if (model?.updated_at && model.updated_at !== model.created_at) {
    events.push({
      id: `synthetic-dev-${product.product_model_id}`,
      stepKey: 'development',
      label: STEP_LABELS.development,
      occurredAt: model.updated_at,
      description: 'Razvoj modela i priprema za proizvodnju.',
      actorRole: null,
      actorName: null,
      extraDetail: null,
      details: {},
      verifiedOnBlockchain: false
    })
  }

  if (product.created_at) {
    events.push({
      id: `synthetic-shop-${product.id}`,
      stepKey: 'added_to_shop',
      label: STEP_LABELS.added_to_shop,
      occurredAt: product.created_at,
      description: 'Proizvod je dodat u prodavnicu i dostupan kupcima.',
      actorRole: null,
      actorName: null,
      extraDetail: null,
      details: {},
      verifiedOnBlockchain: false
    })
  }

  events.sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt))
  return events
}
