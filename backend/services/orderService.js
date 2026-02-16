import { createAdminClient } from './supabaseClient.js'

/**
 * Create a new order with items
 * @param {Object} supabase - Authenticated Supabase client
 * @param {string} userId - User ID
 * @param {Object} orderData - Order data
 * @param {Array} items - Cart items
 * @returns {Promise<Object>} Created order
 */
export const createOrder = async (supabase, userId, orderData, items) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    street,
    addressDetails,
    postalCode,
    city,
    paymentMethod,
    walletAddress
  } = orderData

  // Calculate total price
  const totalPrice = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
    0
  )

  // Za MetaMask/blockchain: status pending dok ne potvrdimo transakciju
  const isBlockchainPayment = paymentMethod === 'metamask'
  const status = isBlockchainPayment ? 'pending_blockchain' : 'ready_for_shipping'

  // Create order
  const dbOrderData = {
    total_price: totalPrice,
    status,
    recipient_name: `${firstName} ${lastName}`.trim(),
    recipient_email: email,
    recipient_phone: phone ? `+381${phone}` : null,
    recipient_street: street,
    recipient_address_details: addressDetails || null,
    recipient_postal_code: postalCode,
    recipient_city: city,
    recipient_country: 'Srbija',
    payment_method: paymentMethod,
    user_id: userId,
    ...(walletAddress && { wallet_address: walletAddress }),
    ...(isBlockchainPayment && { blockchain_network: process.env.BLOCKCHAIN_NETWORK || 'sepolia' })
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(dbOrderData)
    .select()
    .single()

  if (orderError) {
    throw new Error(`Failed to create order: ${orderError.message}`)
  }

  // Create order items
  const orderItems = items.map(item => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    size: item.size || null,
    product_name: item.title || item.product?.title || 'Unknown',
    product_sku: item.product_id // Using product_id as SKU for now
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)

  if (itemsError) {
    // If items fail, try to delete the order (cleanup)
    await supabase.from('orders').delete().eq('id', order.id)
    throw new Error(`Failed to create order items: ${itemsError.message}`)
  }

  return order
}

/**
 * Get orders for a user
 * @param {Object} supabase - Authenticated Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<Array>} User orders
 */
export const getUserOrders = async (supabase, userId) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        product:products (
          id,
          title,
          price,
          image_url
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`)
  }

  return data || []
}

/**
 * Potvrda blockchain plaćanja – ažurira porudžbinu sa tx_hash
 */
export const confirmBlockchainPayment = async (supabase, orderId, userId, paymentData) => {
  const { txHash, amountWei, blockNumber, contractAddress } = paymentData

  if (!txHash || !orderId) {
    throw new Error('txHash i orderId su obavezni')
  }

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, user_id, status')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    throw new Error('Porudžbina nije pronađena')
  }

  if (order.user_id !== userId) {
    throw new Error('Neautorizovano')
  }

  if (order.status !== 'pending_blockchain') {
    throw new Error('Porudžbina nije u statusu pending_blockchain')
  }

  const updateData = {
    tx_hash: txHash,
    status: 'ready_for_shipping',
    ...(amountWei && { amount_wei: String(amountWei) }),
    ...(blockNumber && { block_number: blockNumber }),
    ...(contractAddress && { contract_address: contractAddress })
  }

  const { data: updated, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    throw new Error(`Greška pri ažuriranju: ${error.message}`)
  }

  return updated
}
