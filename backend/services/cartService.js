/**
 * Cart service - handles cart operations for authenticated users
 * Uses authenticated Supabase client from request
 */

/**
 * Get all cart items for a user
 * @param {Object} supabase - Authenticated Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Cart items with product details
 */
export const getCartItems = async (supabase, userId) => {
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      product_id,
      quantity,
      size,
      created_at,
      updated_at,
      products (
        id,
        title,
        description,
        price,
        category,
        image_url,
        sastav,
        odrzavanje,
        poreklo
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data.map((item) => ({
    id: item.id,
    product_id: item.product_id,
    quantity: item.quantity,
    size: item.size || '',
    created_at: item.created_at,
    updated_at: item.updated_at,
    product: item.products,
    // For compatibility with frontend
    key: `${item.product_id}::${item.size || 'na'}`,
    title: item.products?.title,
    price: item.products?.price,
    image_url: item.products?.image_url
  }))
}

/**
 * Add or update item in cart
 * @param {Object} supabase - Authenticated Supabase client
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @param {number} quantity - Quantity to add
 * @param {string} size - Size (optional)
 * @returns {Promise<Object>} Cart item
 */
export const addCartItem = async (supabase, userId, productId, quantity = 1, size = null) => {
  // Check if item already exists
  // Normalize size: null or empty string becomes null
  const normalizedSize = size && size.trim() !== '' ? size.trim() : null
  
  let query = supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', userId)
    .eq('product_id', productId)
  
  if (normalizedSize) {
    query = query.eq('size', normalizedSize)
  } else {
    query = query.is('size', null)
  }
  
  const { data: existing, error: checkError } = await query.maybeSingle()

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 is "not found" which is fine
    throw checkError
  }

  if (existing) {
    // Update quantity
    const newQuantity = existing.quantity + quantity
    const { data, error } = await supabase
      .from('cart_items')
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select(`
        *,
        products (
          id,
          title,
          description,
          price,
          category,
          image_url
        )
      `)
      .single()

    if (error) {
      throw error
    }

    return {
      id: data.id,
      product_id: data.product_id,
      quantity: data.quantity,
      size: data.size || '',
      product: data.products,
      key: `${data.product_id}::${data.size || 'na'}`
    }
  } else {
    // Insert new item
    const { data, error } = await supabase
      .from('cart_items')
      .insert({
        user_id: userId,
        product_id: productId,
        quantity: quantity,
        size: normalizedSize
      })
      .select(`
        *,
        products (
          id,
          title,
          description,
          price,
          category,
          image_url
        )
      `)
      .single()

    if (error) {
      throw error
    }

    return {
      id: data.id,
      product_id: data.product_id,
      quantity: data.quantity,
      size: data.size || '',
      product: data.products,
      key: `${data.product_id}::${data.size || 'na'}`
    }
  }
}

/**
 * Update cart item quantity
 * @param {Object} supabase - Authenticated Supabase client
 * @param {string} userId - User ID
 * @param {string} itemId - Cart item ID
 * @param {number} quantity - New quantity
 * @returns {Promise<Object>} Updated cart item
 */
export const updateCartItemQuantity = async (supabase, userId, itemId, quantity) => {
  if (quantity < 1) {
    throw new Error('Quantity must be at least 1')
  }

  const { data, error } = await supabase
    .from('cart_items')
    .update({
      quantity: quantity,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .eq('user_id', userId)
    .select(`
      *,
      products (
        id,
        title,
        description,
        price,
        category,
        image_url
      )
    `)
    .single()

  if (error) {
    throw error
  }

  return {
    id: data.id,
    product_id: data.product_id,
    quantity: data.quantity,
    size: data.size || '',
    product: data.products,
    key: `${data.product_id}::${data.size || 'na'}`
  }
}

/**
 * Remove item from cart
 * @param {Object} supabase - Authenticated Supabase client
 * @param {string} userId - User ID
 * @param {string} itemId - Cart item ID
 * @returns {Promise<void>}
 */
export const removeCartItem = async (supabase, userId, itemId) => {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}

/**
 * Clear entire cart for a user
 * @param {Object} supabase - Authenticated Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const clearCart = async (supabase, userId) => {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}
