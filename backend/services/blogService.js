import { supabase, createAdminClient } from './supabaseClient.js'

// Koristimo admin client za zaobilaženje RLS problema
// Service role key automatski zaobilaazi RLS policies
// Fallback na običan supabase client ako admin client ne radi
let dbClient
try {
  dbClient = createAdminClient()
  console.log('[BlogService] Admin client created successfully')
} catch (error) {
  console.warn('[BlogService] Failed to create admin client, using fallback:', error.message)
  console.warn('[BlogService] Make sure SUPABASE_SERVICE_ROLE_KEY is set in environment variables')
  dbClient = supabase
}

// Helper funkcija za generisanje slug-a
const generateSlug = (title) => {
  let slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Ukloni dijakritike
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  
  return slug
}

// Helper funkcija za proveru jedinstvenosti slug-a
const ensureUniqueSlug = async (slug, excludeId = null) => {
  let finalSlug = slug
  let counter = 1
  
  while (true) {
    let query = dbClient
      .from('blog_posts')
      .select('id')
      .eq('slug', finalSlug)
    
    if (excludeId) {
      query = query.neq('id', excludeId)
    }
    
    const { data } = await query
    
    if (!data || data.length === 0) {
      return finalSlug
    }
    
    finalSlug = `${slug}-${counter}`
    counter++
  }
}

// Dobavi sve objavljene blog postove (javna ruta)
export const getPublishedBlogPosts = async (options = {}) => {
  try {
    const { category, limit, offset, search } = options
    
    console.log('[BlogService] Fetching published blog posts...', { category, limit, offset, search })
    console.log('[BlogService] Using client type:', dbClient === supabase ? 'supabase (anon)' : 'admin')
    
    let query = dbClient
      .from('blog_posts')
      .select(`
        *,
        blog_post_categories (
          blog_categories (
            id,
            name,
            slug
          )
        )
      `)
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
  
  // Filtriraj po kategoriji ako je prosleđena
  // Napomena: Supabase ne podržava direktno filtriranje kroz nested relacije u ovom slučaju
  // Zato ćemo filtrirati na aplikacionom nivou nakon učitavanja
  
  // Pretraga po naslovu ili excerpt-u
  if (search) {
    query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`)
  }
  
  // Paginacija
  if (limit) {
    query = query.limit(limit)
  }
  if (offset) {
    query = query.range(offset, offset + (limit || 10) - 1)
  }
  
    const { data, error } = await query
    
    if (error) {
      console.error('[BlogService] Error fetching blog posts:', error)
      console.error('[BlogService] Error code:', error.code)
      console.error('[BlogService] Error message:', error.message)
      console.error('[BlogService] Error details:', error.details)
      console.error('[BlogService] Error hint:', error.hint)
      
      // Ako je greška vezana za RLS, probaj sa admin client-om eksplicitno
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
        console.log('[BlogService] RLS error detected, trying with explicit admin client...')
        try {
          const adminClient = createAdminClient()
          let adminQuery = adminClient
            .from('blog_posts')
            .select(`
              *,
              blog_post_categories (
                blog_categories (
                  id,
                  name,
                  slug
                )
              )
            `)
            .eq('status', 'published')
            .not('published_at', 'is', null)
            .lte('published_at', new Date().toISOString())
            .order('published_at', { ascending: false })
          
          if (search) {
            adminQuery = adminQuery.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`)
          }
          
          if (limit) {
            adminQuery = adminQuery.limit(limit)
          }
          if (offset) {
            adminQuery = adminQuery.range(offset, offset + (limit || 10) - 1)
          }
          
          const { data: adminData, error: adminError } = await adminQuery
          
          if (adminError) {
            throw adminError
          }
          
          console.log('[BlogService] Successfully fetched blog posts with admin client:', adminData?.length || 0)
          
          // Transformiši podatke
          let transformedData = adminData.map(post => ({
            ...post,
            categories: post.blog_post_categories?.map(pc => pc.blog_categories).filter(Boolean) || []
          }))
          
          if (category) {
            transformedData = transformedData.filter(post =>
              post.categories.some(cat => cat.slug === category)
            )
          }
          
          return transformedData
        } catch (adminErr) {
          console.error('[BlogService] Admin client also failed:', adminErr)
          throw new Error(`Failed to fetch blog posts: ${error.message}`)
        }
      }
      
      throw new Error(`Failed to fetch blog posts: ${error.message}`)
    }
    
    console.log('[BlogService] Successfully fetched blog posts:', data?.length || 0)
    
    // Transformiši podatke za lakše korišćenje
    let transformedData = data.map(post => ({
      ...post,
      categories: post.blog_post_categories?.map(pc => pc.blog_categories).filter(Boolean) || []
    }))
    
    // Filtriraj po kategoriji ako je prosleđena (nakon transformacije)
    if (category) {
      transformedData = transformedData.filter(post =>
        post.categories.some(cat => cat.slug === category)
      )
    }
    
    return transformedData
  } catch (err) {
    console.error('[BlogService] Exception in getPublishedBlogPosts:', err)
    throw err
  }
}

// Dobavi jedan blog post po slug-u ili ID-u (javna ruta)
export const getBlogPostBySlug = async (slugOrId) => {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId)
  
  let query = dbClient
    .from('blog_posts')
    .select(`
      *,
      blog_post_categories (
        blog_categories (
          id,
          name,
          slug
        )
      ),
      profiles:created_by (
        full_name
      )
    `)
  
  if (isUuid) {
    query = query.eq('id', slugOrId)
  } else {
    query = query.eq('slug', slugOrId)
  }
  
  const { data, error } = await query.maybeSingle()
  
  if (error) {
    throw new Error(`Failed to fetch blog post: ${error.message}`)
  }
  
  if (!data) {
    return null
  }
  
  return {
    ...data,
    categories: data.blog_post_categories?.map(pc => pc.blog_categories) || [],
    author: data.profiles?.full_name || 'Admin'
  }
}

// Dobavi sve blog postove za admin panel (uključujući draft i archived)
export const getAllBlogPosts = async (options = {}) => {
  const { status, limit, offset, search } = options
  
  let query = dbClient
    .from('blog_posts')
    .select(`
      *,
      blog_post_categories (
        blog_categories (
          id,
          name,
          slug
        )
      ),
      profiles:created_by (
        full_name
      )
    `)
    .order('created_at', { ascending: false })
  
  // Filtriraj po statusu
  if (status) {
    query = query.eq('status', status)
  }
  
  // Pretraga
  if (search) {
    query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`)
  }
  
  // Paginacija
  if (limit) {
    query = query.limit(limit)
  }
  if (offset) {
    query = query.range(offset, offset + (limit || 10) - 1)
  }
  
  const { data, error } = await query
  
  if (error) {
    throw new Error(`Failed to fetch blog posts: ${error.message}`)
  }
  
  return data.map(post => ({
    ...post,
    categories: post.blog_post_categories?.map(pc => pc.blog_categories) || [],
    author: post.profiles?.full_name || 'Admin'
  }))
}

// Kreiraj novi blog post
export const createBlogPost = async (postData, userId) => {
  const { title, excerpt, content, featured_image_url, published_at, status = 'draft', category_ids = [] } = postData
  
  if (!title || !content) {
    throw new Error('Title and content are required')
  }
  
  // Generiši slug
  const baseSlug = generateSlug(title)
  const slug = await ensureUniqueSlug(baseSlug)
  
  // Kreiraj post
  const { data: post, error: postError } = await dbClient
    .from('blog_posts')
    .insert({
      title,
      slug,
      excerpt: excerpt || null,
      content,
      featured_image_url: featured_image_url || null,
      published_at: published_at || null,
      status: status || 'draft',
      created_by: userId
    })
    .select()
    .single()
  
  if (postError) {
    throw new Error(`Failed to create blog post: ${postError.message}`)
  }
  
  // Dodaj kategorije ako postoje
  if (category_ids && category_ids.length > 0) {
    const categoryLinks = category_ids.map(catId => ({
      post_id: post.id,
      category_id: catId
    }))
    
    const { error: categoryError } = await dbClient
      .from('blog_post_categories')
      .insert(categoryLinks)
    
    if (categoryError) {
      console.error('Failed to link categories:', categoryError)
      // Ne bacaj grešku, post je već kreiran
    }
  }
  
  // Vrati post sa kategorijama
  return getBlogPostById(post.id)
}

// Ažuriraj blog post
export const updateBlogPost = async (postId, postData, userId) => {
  const { title, excerpt, content, featured_image_url, published_at, status, category_ids } = postData
  
  // Ako se menja naslov, ažuriraj i slug
  let updateData = {}
  if (title) {
    const baseSlug = generateSlug(title)
    updateData.slug = await ensureUniqueSlug(baseSlug, postId)
    updateData.title = title
  }
  if (excerpt !== undefined) updateData.excerpt = excerpt
  if (content) updateData.content = content
  if (featured_image_url !== undefined) updateData.featured_image_url = featured_image_url
  if (published_at !== undefined) updateData.published_at = published_at
  if (status) updateData.status = status
  
  const { data: post, error: postError } = await dbClient
    .from('blog_posts')
    .update(updateData)
    .eq('id', postId)
    .select()
    .single()
  
  if (postError) {
    throw new Error(`Failed to update blog post: ${postError.message}`)
  }
  
  // Ažuriraj kategorije ako su prosleđene
  if (category_ids !== undefined) {
    // Obriši postojeće veze
    await dbClient
      .from('blog_post_categories')
      .delete()
      .eq('post_id', postId)
    
    // Dodaj nove veze
    if (category_ids && category_ids.length > 0) {
      const categoryLinks = category_ids.map(catId => ({
        post_id: postId,
        category_id: catId
      }))
      
      const { error: categoryError } = await dbClient
        .from('blog_post_categories')
        .insert(categoryLinks)
      
      if (categoryError) {
        console.error('Failed to update categories:', categoryError)
      }
    }
  }
  
  return getBlogPostById(postId)
}

// Obriši blog post
export const deleteBlogPost = async (postId) => {
  const { error } = await dbClient
    .from('blog_posts')
    .delete()
    .eq('id', postId)
  
  if (error) {
    throw new Error(`Failed to delete blog post: ${error.message}`)
  }
  
  return { success: true }
}

// Dobavi blog post po ID-u (za admin)
export const getBlogPostById = async (postId) => {
  const { data, error } = await dbClient
    .from('blog_posts')
    .select(`
      *,
      blog_post_categories (
        blog_categories (
          id,
          name,
          slug
        )
      ),
      profiles:created_by (
        full_name
      )
    `)
    .eq('id', postId)
    .single()
  
  if (error) {
    throw new Error(`Failed to fetch blog post: ${error.message}`)
  }
  
  return {
    ...data,
    categories: data.blog_post_categories?.map(pc => pc.blog_categories) || [],
    author: data.profiles?.full_name || 'Admin'
  }
}

// Dobavi sve kategorije
export const getBlogCategories = async () => {
  try {
    console.log('[BlogService] Fetching blog categories...')
    console.log('[BlogService] Using client type:', dbClient === supabase ? 'supabase (anon)' : 'admin')
    
    const { data, error } = await dbClient
      .from('blog_categories')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) {
      console.error('[BlogService] Error fetching categories:', error)
      console.error('[BlogService] Error code:', error.code)
      console.error('[BlogService] Error message:', error.message)
      console.error('[BlogService] Error details:', error.details)
      console.error('[BlogService] Error hint:', error.hint)
      
      // Ako je greška vezana za RLS, probaj sa admin client-om eksplicitno
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
        console.log('[BlogService] RLS error detected, trying with explicit admin client...')
        try {
          const adminClient = createAdminClient()
          const { data: adminData, error: adminError } = await adminClient
            .from('blog_categories')
            .select('*')
            .order('name', { ascending: true })
          
          if (adminError) {
            throw adminError
          }
          
          console.log('[BlogService] Successfully fetched categories with admin client:', adminData?.length || 0)
          return adminData || []
        } catch (adminErr) {
          console.error('[BlogService] Admin client also failed:', adminErr)
          throw new Error(`Failed to fetch categories: ${error.message}`)
        }
      }
      
      throw new Error(`Failed to fetch categories: ${error.message}`)
    }
    
    console.log('[BlogService] Successfully fetched categories:', data?.length || 0)
    if (data && data.length > 0) {
      console.log('[BlogService] Categories:', data.map(c => c.name).join(', '))
    }
    return data || []
  } catch (err) {
    console.error('[BlogService] Exception in getBlogCategories:', err)
    throw err
  }
}

// Kreiraj novu kategoriju
export const createBlogCategory = async (categoryData) => {
  const { name, description } = categoryData
  
  if (!name) {
    throw new Error('Category name is required')
  }
  
  const slug = generateSlug(name)
  
  const { data, error } = await dbClient
    .from('blog_categories')
    .insert({
      name,
      slug,
      description: description || null
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create category: ${error.message}`)
  }
  
  return data
}

// Ažuriraj status blog posta (publish/unpublish/archive)
export const updateBlogPostStatus = async (postId, status) => {
  const updateData = { status }
  
  // Ako se objavljuje, postavi published_at ako već nije postavljen
  if (status === 'published') {
    const { data: currentPost } = await dbClient
      .from('blog_posts')
      .select('published_at')
      .eq('id', postId)
      .single()
    
    if (!currentPost?.published_at) {
      updateData.published_at = new Date().toISOString()
    }
  }
  
  const { data, error } = await dbClient
    .from('blog_posts')
    .update(updateData)
    .eq('id', postId)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update blog post status: ${error.message}`)
  }
  
  return data
}
