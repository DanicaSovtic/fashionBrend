import { createAdminClient } from './supabaseClient.js'

const SOURCE_LABELS = {
  website: 'Sajt',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  newsletter: 'Newsletter'
}

/**
 * Marketing analitika: najprodavaniji proizvodi, prodaja po periodu, prodaja po izvoru
 * @param {Object} filters - { date_from, date_to }
 * @returns {Promise<Object>}
 */
export const getMarketingAnalytics = async (filters = {}) => {
  const adminSupabase = createAdminClient()

  let query = adminSupabase
    .from('orders')
    .select(`
      id,
      total_price,
      created_at,
      acquisition_source,
      status,
      order_items (
        product_id,
        product_name,
        quantity,
        product_sku
      )
    `)
    .order('created_at', { ascending: true })

  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from)
  }
  if (filters.date_to) {
    const dateTo = new Date(filters.date_to)
    dateTo.setDate(dateTo.getDate() + 1)
    query = query.lt('created_at', dateTo.toISOString())
  }

  const { data: orders, error } = await query

  if (error) {
    throw new Error(`Failed to fetch orders for analytics: ${error.message}`)
  }

  // Samo porudžbine koje računamo kao „prodate” (isporučene ili u toku)
  const completedStatuses = ['delivered', 'ready_for_shipping', 'in_transit']
  const relevantOrders = (orders || []).filter(o =>
    completedStatuses.includes(o.status)
  )

  // --- Top proizvodi (po količini i po prihodu)
  const productMap = new Map() // product_id -> { product_name, quantity, revenue }

  relevantOrders.forEach(order => {
    const orderItems = order.order_items || []
    orderItems.forEach(item => {
      const id = item.product_id || item.product_sku || 'unknown'
      const name = item.product_name || 'Proizvod bez naziva'
      const qty = Number(item.quantity) || 0
      // Prihod po stavci približno: (total_price / ukupno stavki) * quantity – pojednostavljeno koristimo prosek po porudžbini
      const orderTotal = Number(order.total_price) || 0
      const totalItemsInOrder = orderItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
      const revenueShare = totalItemsInOrder > 0 ? (orderTotal * qty) / totalItemsInOrder : 0

      if (!productMap.has(id)) {
        productMap.set(id, { product_id: id, product_name: name, quantity: 0, revenue: 0 })
      }
      const rec = productMap.get(id)
      rec.quantity += qty
      rec.revenue += revenueShare
    })
  })

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 20)

  // --- Prodaja po periodu (po mesecu)
  const byMonth = {}
  relevantOrders.forEach(o => {
    if (!o.created_at) return
    const d = new Date(o.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!byMonth[key]) {
      byMonth[key] = { month: key, totalRevenue: 0, orderCount: 0 }
    }
    byMonth[key].totalRevenue += Number(o.total_price) || 0
    byMonth[key].orderCount += 1
  })

  const salesByPeriod = Object.values(byMonth)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(item => ({
      ...item,
      monthLabel: new Date(item.month + '-01').toLocaleDateString('sr-RS', { month: 'short', year: 'numeric' })
    }))

  // --- Prodaja po izvoru (acquisition_source)
  const bySource = {}
  relevantOrders.forEach(o => {
    const src = o.acquisition_source || 'website'
    const label = SOURCE_LABELS[src] || (src === 'website' ? 'Sajt' : src)
    if (!bySource[label]) {
      bySource[label] = { source: label, totalRevenue: 0, orderCount: 0 }
    }
    bySource[label].totalRevenue += Number(o.total_price) || 0
    bySource[label].orderCount += 1
  })

  const salesBySource = Object.values(bySource).sort((a, b) => b.totalRevenue - a.totalRevenue)

  // --- Ukupni rezime
  const totalRevenue = relevantOrders.reduce((s, o) => s + (Number(o.total_price) || 0), 0)
  const totalOrders = relevantOrders.length

  return {
    summary: {
      totalRevenue,
      totalOrders
    },
    topProducts,
    salesByPeriod,
    salesBySource
  }
}
