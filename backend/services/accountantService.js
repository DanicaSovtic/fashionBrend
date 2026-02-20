import { createAdminClient } from './supabaseClient.js'

/**
 * Get all transactions for accountant view
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Transactions and summary
 */
export const getAccountantTransactions = async (filters = {}) => {
  const adminSupabase = createAdminClient()
  
  let query = adminSupabase
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        product_id,
        quantity,
        product_name,
        product_sku,
        size,
        color
      )
    `)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.payment_method) {
    query = query.eq('payment_method', filters.payment_method)
  }

  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from)
  }

  if (filters.date_to) {
    // Add one day to include the entire day
    const dateTo = new Date(filters.date_to)
    dateTo.setDate(dateTo.getDate() + 1)
    query = query.lt('created_at', dateTo.toISOString())
  }

  const { data: transactions, error } = await query

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`)
  }

  // Get expenses from material requests (completed/sent ones)
  let expensesQuery = adminSupabase
    .from('material_requests')
    .select('*')
    .in('status', ['completed', 'sent'])
    .not('supplier_id', 'is', null) // Only requests with assigned supplier

  if (filters.date_from) {
    expensesQuery = expensesQuery.gte('created_at', filters.date_from)
  }

  if (filters.date_to) {
    const dateTo = new Date(filters.date_to)
    dateTo.setDate(dateTo.getDate() + 1)
    expensesQuery = expensesQuery.lt('created_at', dateTo.toISOString())
  }

  const { data: expenses, error: expensesError } = await expensesQuery

  if (expensesError) {
    console.error('Error fetching expenses:', expensesError)
  }

  // Get all inventory items for price lookup
  // Match by: supplier_id, material (case-insensitive), color (case-insensitive)
  const { data: inventoryItems, error: inventoryError } = await adminSupabase
    .from('inventory_items')
    .select('supplier_id, material, color, price_per_kg')
    .eq('status', 'active')

  if (inventoryError) {
    console.error('Error fetching inventory items:', inventoryError)
  }

  // Create a map for quick lookup (normalize keys for case-insensitive matching)
  const priceMap = new Map()
  inventoryItems?.forEach(item => {
    if (item.supplier_id && item.material && item.color && item.price_per_kg) {
      const key = `${item.supplier_id}-${(item.material || '').toLowerCase().trim()}-${(item.color || '').toLowerCase().trim()}`
      const price = Number(item.price_per_kg)
      if (price > 0) {
        priceMap.set(key, price)
      }
    }
  })

  console.log(`[AccountantService] Found ${expenses?.length || 0} expenses and ${inventoryItems?.length || 0} inventory items`)
  console.log(`[AccountantService] Price map size: ${priceMap.size}`)

  // Calculate revenue (from completed/delivered orders)
  const totalRevenue = transactions
    ?.filter(t => t.status === 'delivered' || t.status === 'ready_for_shipping' || t.status === 'in_transit')
    .reduce((sum, t) => sum + (Number(t.total_price) || 0), 0) || 0

  // Calculate expenses (from material requests)
  // Formula: quantity_kg (or quantity_sent_kg) × price_per_kg (from inventory_items)
  // If price not found, use estimate of 500 RSD/kg
  let totalExpenses = 0
  let expensesWithPrice = 0
  let expensesWithEstimate = 0
  const expenseDetails = []

  expenses?.forEach(exp => {
    // Use quantity_sent_kg if available (actual sent amount), otherwise quantity_kg (requested amount)
    const quantity = Number(exp.quantity_sent_kg || exp.quantity_kg || 0)
    if (quantity <= 0) return

    let pricePerKg = 0
    
    // Try to find price in inventory_items using supplier_id, material, color
    if (exp.supplier_id && exp.material && exp.color) {
      const key = `${exp.supplier_id}-${(exp.material || '').toLowerCase().trim()}-${(exp.color || '').toLowerCase().trim()}`
      pricePerKg = priceMap.get(key) || 0
    }

    // Calculate cost
    const cost = pricePerKg > 0 
      ? quantity * pricePerKg 
      : quantity * 500 // Default 500 RSD/kg estimate if no price found
    
    totalExpenses += cost
    
    if (pricePerKg > 0) {
      expensesWithPrice++
    } else {
      expensesWithEstimate++
    }

    // Add to expense details for frontend display
    expenseDetails.push({
      id: exp.id,
      material: exp.material,
      color: exp.color,
      quantity_kg: quantity,
      quantity_sent_kg: exp.quantity_sent_kg,
      price_per_kg: pricePerKg > 0 ? pricePerKg : null,
      total_cost: cost,
      is_estimated: pricePerKg === 0,
      status: exp.status,
      created_at: exp.created_at,
      model_name: exp.model_name,
      model_sku: exp.model_sku,
      supplier_id: exp.supplier_id
    })
  })

  console.log(`[AccountantService] Expenses calculation: ${expensesWithPrice} with prices, ${expensesWithEstimate} with estimates, total: ${totalExpenses}`)

  // Calculate profit
  const totalProfit = totalRevenue - totalExpenses

  const totalOrders = transactions?.length || 0

  const pendingPayments = transactions
    ?.filter(t => t.status === 'pending_blockchain' || t.status === 'ready_for_shipping')
    .length || 0

  // Group by month for charts
  const monthlyData = {}
  
  // Process transactions by month
  transactions?.forEach(t => {
    if (t.created_at) {
      const date = new Date(t.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, revenue: 0, expenses: 0, profit: 0 }
      }
      if (t.status === 'delivered' || t.status === 'ready_for_shipping' || t.status === 'in_transit') {
        monthlyData[monthKey].revenue += Number(t.total_price) || 0
      }
    }
  })

  // Process expenses by month
  expenses?.forEach(exp => {
    if (exp.created_at) {
      const date = new Date(exp.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, revenue: 0, expenses: 0, profit: 0 }
      }
      
      const quantity = Number(exp.quantity_sent_kg || exp.quantity_kg || 0)
      if (quantity <= 0) return

      let pricePerKg = 0
      
      // Try to find price in inventory_items
      if (exp.supplier_id && exp.material && exp.color) {
        const key = `${exp.supplier_id}-${(exp.material || '').toLowerCase().trim()}-${(exp.color || '').toLowerCase().trim()}`
        pricePerKg = priceMap.get(key) || 0
      }

      const cost = pricePerKg > 0 ? quantity * pricePerKg : quantity * 500
      monthlyData[monthKey].expenses += cost
    }
  })

  // Calculate profit for each month
  Object.keys(monthlyData).forEach(key => {
    monthlyData[key].profit = monthlyData[key].revenue - monthlyData[key].expenses
  })

  // Sort and format monthly data
  const chartData = Object.values(monthlyData)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(item => ({
      ...item,
      monthLabel: new Date(item.month + '-01').toLocaleDateString('sr-RS', { month: 'short', year: 'numeric' })
    }))

  // Get supplier names for expense details
  const supplierIds = [...new Set(expenseDetails.map(e => e.supplier_id).filter(Boolean))]
  const supplierProfiles = {}
  if (supplierIds.length > 0) {
    const { data: suppliers } = await adminSupabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', supplierIds)
    
    suppliers?.forEach(s => {
      supplierProfiles[s.user_id] = s.full_name
    })
  }

  // Add supplier names to expense details
  expenseDetails.forEach(exp => {
    exp.supplier_name = supplierProfiles[exp.supplier_id] || 'Nepoznat dobavljač'
  })

  return {
    transactions: transactions || [],
    summary: {
      totalRevenue,
      totalExpenses,
      totalProfit,
      totalOrders,
      pendingPayments
    },
    chartData: chartData.slice(-12), // Last 12 months
    expenseDetails: expenseDetails.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) // Sort by date, newest first
  }
}
