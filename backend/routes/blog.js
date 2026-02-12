import { Router } from 'express'
import {
  getPublishedBlogPosts,
  getBlogPostBySlug,
  getAllBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getBlogPostById,
  getBlogCategories,
  createBlogCategory,
  updateBlogPostStatus
} from '../services/blogService.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Middleware za logovanje svih zahteva - ovo će se izvršiti za SVE rute u ovom routeru
router.use((req, res, next) => {
  console.log('[BlogRoute] Router middleware hit - Request:', req.method, req.originalUrl || req.url, req.path)
  next()
})

// Test ruta za proveru da li router radi
router.get('/blog/test', (req, res) => {
  console.log('[BlogRoute] Test endpoint hit!')
  res.json({ message: 'Blog router is working!', timestamp: new Date().toISOString() })
})

// JAVNE RUTE - dostupne svima (bez autentifikacije)

// Dobavi sve objavljene blog postove - JAVNA RUTA (bez autentifikacije)
// Dostupno svima, uključujući 'krajnji_korisnik' i neautentifikovane korisnike
router.get('/blog/posts', async (req, res, next) => {
  try {
    console.log('[BlogRoute] GET /blog/posts - Request received')
    console.log('[BlogRoute] Request query:', req.query)
    const { category, limit, offset, search } = req.query
    
    const posts = await getPublishedBlogPosts({
      category: category || null,
      limit: limit ? parseInt(limit) : null,
      offset: offset ? parseInt(offset) : null,
      search: search || null
    })
    
    console.log('[BlogRoute] GET /blog/posts - Success, returning', posts.length, 'posts')
    res.json(posts)
  } catch (error) {
    console.error('[BlogRoute] Error fetching published posts:', error)
    console.error('[BlogRoute] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    })
    res.status(500).json({ 
      error: error.message || 'Greška prilikom učitavanja blog postova',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Dobavi jedan blog post po slug-u ili ID-u
router.get('/blog/posts/:slugOrId', async (req, res, next) => {
  try {
    const { slugOrId } = req.params
    const post = await getBlogPostBySlug(slugOrId)
    
    if (!post) {
      res.status(404).json({ error: 'Blog post not found' })
      return
    }
    
    // Proveri da li je objavljen (za javnu rutu)
    if (post.status !== 'published' || !post.published_at || new Date(post.published_at) > new Date()) {
      res.status(404).json({ error: 'Blog post not found' })
      return
    }
    
    res.json(post)
  } catch (error) {
    console.error('[BlogRoute] Error fetching blog post:', error)
    next(error)
  }
})

// Dobavi sve kategorije - JAVNA RUTA (bez autentifikacije)
router.get('/blog/categories', async (req, res, next) => {
  try {
    console.log('[BlogRoute] GET /blog/categories - Request received')
    console.log('[BlogRoute] Request headers:', req.headers)
    const categories = await getBlogCategories()
    console.log('[BlogRoute] GET /blog/categories - Success, returning', categories.length, 'categories')
    res.json(categories)
  } catch (error) {
    console.error('[BlogRoute] Error fetching categories:', error)
    console.error('[BlogRoute] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    })
    res.status(500).json({ 
      error: error.message || 'Greška prilikom učitavanja kategorija',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// ADMIN RUTE - samo za superadmin

// Dobavi sve blog postove (uključujući draft i archived)
router.get(
  '/blog/admin/posts',
  requireAuth,
  requireRole(['superadmin']),
  async (req, res, next) => {
    try {
      const { status, limit, offset, search } = req.query
      
      const posts = await getAllBlogPosts({
        status: status || null,
        limit: limit ? parseInt(limit) : null,
        offset: offset ? parseInt(offset) : null,
        search: search || null
      })
      
      res.json(posts)
    } catch (error) {
      console.error('[BlogRoute] Error fetching all posts:', error)
      next(error)
    }
  }
)

// Dobavi jedan blog post po ID-u (admin)
router.get(
  '/blog/admin/posts/:id',
  requireAuth,
  requireRole(['superadmin']),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const post = await getBlogPostById(id)
      
      if (!post) {
        res.status(404).json({ error: 'Blog post not found' })
        return
      }
      
      res.json(post)
    } catch (error) {
      console.error('[BlogRoute] Error fetching blog post:', error)
      next(error)
    }
  }
)

// Kreiraj novi blog post
router.post(
  '/blog/admin/posts',
  requireAuth,
  requireRole(['superadmin']),
  async (req, res, next) => {
    try {
      const postData = req.body
      const userId = req.user.id
      
      const post = await createBlogPost(postData, userId)
      res.status(201).json(post)
    } catch (error) {
      console.error('[BlogRoute] Error creating blog post:', error)
      next(error)
    }
  }
)

// Ažuriraj blog post
router.patch(
  '/blog/admin/posts/:id',
  requireAuth,
  requireRole(['superadmin']),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const postData = req.body
      const userId = req.user.id
      
      const post = await updateBlogPost(id, postData, userId)
      res.json(post)
    } catch (error) {
      console.error('[BlogRoute] Error updating blog post:', error)
      next(error)
    }
  }
)

// Obriši blog post
router.delete(
  '/blog/admin/posts/:id',
  requireAuth,
  requireRole(['superadmin']),
  async (req, res, next) => {
    try {
      const { id } = req.params
      await deleteBlogPost(id)
      res.json({ success: true })
    } catch (error) {
      console.error('[BlogRoute] Error deleting blog post:', error)
      next(error)
    }
  }
)

// Ažuriraj status blog posta (publish/unpublish/archive)
router.patch(
  '/blog/admin/posts/:id/status',
  requireAuth,
  requireRole(['superadmin']),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const { status } = req.body
      
      if (!status || !['draft', 'published', 'archived'].includes(status)) {
        res.status(400).json({ error: 'Invalid status. Must be draft, published, or archived' })
        return
      }
      
      const post = await updateBlogPostStatus(id, status)
      res.json(post)
    } catch (error) {
      console.error('[BlogRoute] Error updating blog post status:', error)
      next(error)
    }
  }
)

// Kreiraj novu kategoriju
router.post(
  '/blog/admin/categories',
  requireAuth,
  requireRole(['superadmin']),
  async (req, res, next) => {
    try {
      const categoryData = req.body
      const category = await createBlogCategory(categoryData)
      res.status(201).json(category)
    } catch (error) {
      console.error('[BlogRoute] Error creating category:', error)
      next(error)
    }
  }
)

export default router
