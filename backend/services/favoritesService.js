/**
 * Favorites service - handles favorites operations for authenticated users
 * Uses authenticated Supabase client from request
 */

/**
 * Get all favorites for a user
 * @param {Object} supabase - Authenticated Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Favorite items with product details
 */
export const getFavorites = async (supabase, userId) => {
  const { data, error } = await supabase
    .from('favorites')
    .select(`
      id,
      product_id,
      created_at,
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
    id: item.product_id,
    favorite_id: item.id,
    created_at: item.created_at,
    title: item.products?.title,
    price: item.products?.price,
    image_url: item.products?.image_url,
    product: item.products
  }))
}

/**
 * Add product to favorites
 * @param {Object} supabase - Authenticated Supabase client
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Favorite item
 */
export const addFavorite = async (supabase, userId, productId) => {
  // Check if already exists
  const { data: existing, error: checkError } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle()

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError
  }

  if (existing) {
    // Already exists, return it
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    return {
      id: productId,
      favorite_id: existing.id,
      created_at: existing.created_at,
      product: product
    }
  }

  // Insert new favorite
  const { data, error } = await supabase
    .from('favorites')
    .insert({
      user_id: userId,
      product_id: productId
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
    id: data.product_id,
    favorite_id: data.id,
    created_at: data.created_at,
    product: data.products
  }
}

/**
 * Remove product from favorites
 * @param {Object} supabase - Authenticated Supabase client
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @returns {Promise<void>}
 */
export const removeFavorite = async (supabase, userId, productId) => {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)

  if (error) {
    throw error
  }
}

/**
 * Check if product is in favorites
 * @param {Object} supabase - Authenticated Supabase client
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @returns {Promise<boolean>}
 */
export const isFavorite = async (supabase, userId, productId) => {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return !!data
}
