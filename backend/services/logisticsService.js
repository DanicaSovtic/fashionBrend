const ORDER_STATUSES = ['ready_for_shipping', 'in_transit', 'delivered']
const FAILED_EVENT_STATUSES = ['failed_delivery', 'delivery_failed', 'return_to_sender']

const toMs = (value) => (value ? new Date(value).getTime() : null)

const buildMetrics = (orders = [], returns = []) => {
  const byStatus = ORDER_STATUSES.reduce((acc, status) => {
    acc[status] = 0
    return acc
  }, {})

  let deliveryCount = 0
  let deliveryTotalMs = 0
  let failedDeliveries = 0

  orders.forEach((order) => {
    if (byStatus[order.status] !== undefined) {
      byStatus[order.status] += 1
    }

    if (order.status === 'delivered') {
      const createdAt = toMs(order.created_at)
      const deliveredAt = toMs(order.last_status_at)
      if (createdAt && deliveredAt && deliveredAt > createdAt) {
        deliveryTotalMs += deliveredAt - createdAt
        deliveryCount += 1
      }
    }

    const events = Array.isArray(order.shipment_events) ? order.shipment_events : []
    if (events.some((event) => FAILED_EVENT_STATUSES.includes(event.status))) {
      failedDeliveries += 1
    }
  })

  const averageDeliveryDays =
    deliveryCount > 0 ? Number((deliveryTotalMs / deliveryCount / 86400000).toFixed(1)) : null

  const activeShipments = orders.filter((order) => order.status !== 'delivered').length
  const returnRate = orders.length > 0 ? Number(((returns.length / orders.length) * 100).toFixed(1)) : 0

  return {
    activeShipments,
    byStatus,
    averageDeliveryDays,
    failedDeliveries,
    returnRate
  }
}

export const getLogisticsDashboard = async (supabase) => {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(
      `
        id,
        created_at,
        status,
        recipient_name,
        recipient_city,
        recipient_postal_code,
        recipient_country,
        recipient_phone,
        courier_name,
        tracking_number,
        planned_delivery,
        last_status_at,
        last_status_by,
        last_status_note,
        order_items (
          id,
          quantity,
          product_sku,
          product_name,
          size,
          color,
          product:products (
            id,
            title
          )
        ),
        shipment_events (
          id,
          status,
          occurred_at,
          actor,
          note
        )
      `
    )
    .in('status', ORDER_STATUSES)
    .order('created_at', { ascending: false })

  if (ordersError) {
    throw ordersError
  }

  const { data: returns, error: returnsError } = await supabase
    .from('returns')
    .select(
      `
        id,
        order_id,
        reason,
        status,
        received_at,
        created_at,
        order:orders (
          id,
          created_at,
          recipient_name
        )
      `
    )
    .order('created_at', { ascending: false })

  if (returnsError) {
    throw returnsError
  }

  return {
    orders: orders || [],
    returns: returns || [],
    metrics: buildMetrics(orders || [], returns || [])
  }
}

export const getLogisticsIssues = async (supabase, filters = {}) => {
  let query = supabase
    .from('delivery_issues')
    .select(
      `
        id,
        order_id,
        issue_type,
        status,
        occurred_at,
        note,
        resolution_action,
        resolved_at,
        last_updated_by,
        created_at,
        updated_at,
        order:orders (
          id,
          created_at,
          status,
          recipient_name,
          recipient_city,
          recipient_postal_code,
          recipient_country,
          recipient_phone,
          courier_name,
          tracking_number,
          planned_delivery,
          last_status_at,
          last_status_by,
          last_status_note,
          shipment_events (
            id,
            status,
            occurred_at,
            actor,
            note
          )
        ),
        comments:delivery_issue_comments (
          id,
          author,
          body,
          created_at
        )
      `
    )
    .order('occurred_at', { ascending: false })

  if (filters.issue_type) {
    query = query.eq('issue_type', filters.issue_type)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.from) {
    query = query.gte('occurred_at', filters.from)
  }
  if (filters.to) {
    query = query.lte('occurred_at', filters.to)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  return data || []
}

export const updateLogisticsIssue = async (supabase, issueId, payload = {}) => {
  const updatePayload = {
    ...payload,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('delivery_issues')
    .update(updatePayload)
    .eq('id', issueId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export const addLogisticsIssueComment = async (supabase, issueId, comment) => {
  const { data, error } = await supabase
    .from('delivery_issue_comments')
    .insert({
      issue_id: issueId,
      author: comment.author || 'distributer',
      body: comment.body
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}
