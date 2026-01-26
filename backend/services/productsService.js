import fetch from 'node-fetch'
import { supabase } from './supabaseClient.js'

const PRODUCTS_API_URL =
  process.env.PRODUCTS_API_URL || 'https://dummyjson.com/products?limit=100'
const RSD_RATE = Number(process.env.RSD_RATE || 118)

const WOMENS_CATEGORY_ENDPOINTS = [
  'https://dummyjson.com/products/category/womens-dresses',
  'https://dummyjson.com/products/category/tops',
  'https://dummyjson.com/products/category/womens-shoes'
]

const CATEGORY_CONFIG = [
  {
    key: 'kosulje',
    label: 'Košulja',
    description: 'Elegantna ženska košulja za svakodnevne i poslovne kombinacije.'
  },
  {
    key: 'pantalone',
    label: 'Pantalone',
    description: 'Udobne ženske pantalone sa modernim krojem.'
  },
  {
    key: 'suknje',
    label: 'Suknja',
    description: 'Ženska suknja koja prati liniju i ističe stil.'
  },
  {
    key: 'haljine',
    label: 'Haljina',
    description: 'Ženska haljina za dnevne i večernje prilike.'
  },
  {
    key: 'jakne',
    label: 'Jakna',
    description: 'Lagana ženska jakna za prelazne sezone.'
  },
  {
    key: 'obuca',
    label: 'Obuća',
    description: 'Ženska obuća sa naglaskom na udobnost i stil.'
  }
]

const isWomenCategory = (rawCategory) => rawCategory.includes('women')

const extractProducts = (payload) =>
  Array.isArray(payload) ? payload : payload.products || []

const fetchProducts = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status}`)
  }
  return response.json()
}

const fetchProductsFromEndpoints = async (endpoints) => {
  const results = await Promise.all(endpoints.map((endpoint) => fetchProducts(endpoint)))
  return results.flatMap((payload) => extractProducts(payload))
}

const normalizeImage = (item) =>
  item.thumbnail || item.image || item.images?.[0] || null

const priceToRsd = (price) => Math.round((price || 0) * RSD_RATE)

const buildSeedProducts = (sourceItems, countPerCategory = 10) => {
  const pool = sourceItems.filter((item) => normalizeImage(item))
  if (pool.length === 0) {
    return []
  }

  const products = []
  CATEGORY_CONFIG.forEach((category) => {
    for (let index = 0; index < countPerCategory; index += 1) {
      const source = pool[index % pool.length]
      products.push({
        title: `Ženska ${category.label} ${String(index + 1).padStart(2, '0')}`,
        description: category.description,
        price: priceToRsd(source.price || 59),
        category: category.key,
        image_url: normalizeImage(source)
      })
    }
  })

  return products
}

export const getProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

export const seedProducts = async ({ replace = false } = {}) => {
  const payload = await fetchProducts(PRODUCTS_API_URL)
  let apiProducts = extractProducts(payload)

  const womensOnly = apiProducts.filter((item) =>
    isWomenCategory(String(item.category || '').toLowerCase())
  )

  if (
    womensOnly.length === 0 &&
    PRODUCTS_API_URL.includes('dummyjson.com/products')
  ) {
    apiProducts = await fetchProductsFromEndpoints(WOMENS_CATEGORY_ENDPOINTS)
  }

  const womensFiltered = apiProducts.filter((item) =>
    isWomenCategory(String(item.category || '').toLowerCase())
  )

  const mappedProducts = buildSeedProducts(womensFiltered, 10)

  if (replace) {
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .not('id', 'is', null)
    if (deleteError) {
      throw deleteError
    }
  }

  const { data: existing, error: existingError } = await supabase
    .from('products')
    .select('title, category')

  if (existingError) {
    throw existingError
  }

  const existingKeys = new Set(
    existing.map((item) => `${item.title}::${item.category}`)
  )
  const newProducts = mappedProducts.filter(
    (item) => !existingKeys.has(`${item.title}::${item.category}`)
  )

  if (newProducts.length === 0) {
    return {
      inserted: 0,
      message: 'No new products to insert.',
      counts: {
        fetched: apiProducts.length,
        womens: womensFiltered.length,
        mapped: mappedProducts.length
      }
    }
  }

  const { data, error } = await supabase
    .from('products')
    .insert(newProducts)
    .select('*')

  if (error) {
    throw error
  }

  return {
    inserted: data.length,
    items: data,
    counts: {
      fetched: apiProducts.length,
      womens: womensFiltered.length,
      mapped: mappedProducts.length
    }
  }
}
