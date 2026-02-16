import { Router } from 'express'
import {
  getPublicCollections,
  getCollectionById,
  getCollectionWithProductModels,
  getCollectionStats,
  getProductModelApprovals,
  getProductModelComments,
  createProductModelComment,
  updateCollectionStatus
} from '../services/collectionsService.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Logging middleware za debug
router.use('*', (req, res, next) => {
  if (req.path.startsWith('/blog')) {
    console.log('[CollectionsRouter] Request intercepted:', req.method, req.path)
  }
  next()
})

// Javna ruta za sve korisnike - prikazuje samo finalne proizvode
router.get('/collections', async (req, res, next) => {
  try {
    const { type } = req.query
    const collections = await getPublicCollections(type)
    res.json(collections)
  } catch (error) {
    console.error('[CollectionsRoute] Error in GET /collections:', error)
    res.status(500).json({ 
      error: error.message || 'Greška prilikom učitavanja kolekcija',
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// /designer/collections i /tester/collections su u testerDesigner.js (prvi ruter)

// SPECIFIČNE RUTE MORAJU BITI PRE DINAMIČKIH RUTA
// PATCH endpoint za promenu statusa kolekcije - samo modni dizajner
router.patch('/collections/:id/status', requireAuth, requireRole(['modni_dizajner', 'superadmin']), async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!status) {
      res.status(400).json({ error: 'Status je obavezan' })
      return
    }

    // Učitaj profil ako već nije učitan
    if (!req.profile && req.supabase) {
      const { data, error } = await req.supabase
        .from('profiles')
        .select('*')
        .eq('user_id', req.user.id)
        .single()

      if (!error && data) {
        req.profile = data
      }
    }

    const updatedCollection = await updateCollectionStatus(id, status)
    res.json(updatedCollection)
  } catch (error) {
    console.error('[CollectionsRoute] Error updating collection status:', error)
    next(error)
  }
})

// DINAMIČKE RUTE - moraju biti posle specifičnih ruta
router.get('/collections/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const collection = await getCollectionById(id)
    res.json(collection)
  } catch (error) {
    next(error)
  }
})

router.get('/collections/:id/products', async (req, res, next) => {
  try {
    const { id } = req.params
    const collectionWithModels = await getCollectionWithProductModels(id)
    res.json(collectionWithModels)
  } catch (error) {
    next(error)
  }
})

router.get('/collections/:id/stats', async (req, res, next) => {
  try {
    const { id } = req.params
    const stats = await getCollectionStats(id)
    res.json(stats)
  } catch (error) {
    next(error)
  }
})

router.get('/product-models/:modelId/approvals', requireAuth, requireRole(['modni_dizajner', 'tester_kvaliteta']), async (req, res, next) => {
  try {
    const { modelId } = req.params
    const approvals = await getProductModelApprovals(modelId)
    res.json(approvals)
  } catch (error) {
    next(error)
  }
})

// GET endpoint za komentare - dozvoljeno svim autentifikovanim korisnicima
router.get('/product-models/:modelId/comments', requireAuth, async (req, res, next) => {
  try {
    const { modelId } = req.params
    const comments = await getProductModelComments(modelId)
    res.json(comments)
  } catch (error) {
    next(error)
  }
})

// POST endpoint za dodavanje komentara - dozvoljeno svim autentifikovanim korisnicima
router.post('/product-models/:modelId/comments', requireAuth, async (req, res, next) => {
  try {
    const { modelId } = req.params
    const { body, author_name, role } = req.body

    if (!body || !body.trim()) {
      res.status(400).json({ error: 'Tekst komentara je obavezan' })
      return
    }

    // Učitaj profil ako već nije učitan
    if (!req.profile) {
      const { data, error } = await req.supabase
        .from('profiles')
        .select('*')
        .eq('user_id', req.user.id)
        .single()

      if (!error && data) {
        req.profile = data
      }
    }
    
    const comment = await createProductModelComment(modelId, {
      body,
      author_name: author_name || req.profile?.full_name || req.user?.email || 'Korisnik',
      role: role || req.profile?.role || 'korisnik'
    })
    res.status(201).json(comment)
  } catch (error) {
    console.error('[CollectionsRoute] Error creating comment:', error)
    next(error)
  }
})

export default router
