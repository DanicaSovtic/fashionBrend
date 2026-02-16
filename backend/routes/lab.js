/**
 * Lab router - za laboratoriju da šalje rezultate testova
 * Montira se na /api/lab
 */
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { getProductModelById } from '../services/collectionsService.js'
import { createAdminClient } from '../services/supabaseClient.js'
import { checkMaterialExists, getMaterialPercentage } from '../utils/materialParser.js'

const router = Router()
const adminSupabase = createAdminClient()

/**
 * POST /api/lab/verify-material
 * Laborant šalje rezultate testa materijala
 * Očekuje: { productModelId, materialName, percentage, certificateHash, notes }
 */
router.post('/verify-material', requireAuth, requireRole(['laborant']), async (req, res, next) => {
  try {
    const { productModelId, materialName, percentage, certificateHash, notes } = req.body

    if (!productModelId || !materialName || percentage === undefined) {
      res.status(400).json({ 
        error: 'productModelId, materialName i percentage su obavezni' 
      })
      return
    }

    // Proveri da li proizvod postoji
    const product = await getProductModelById(productModelId)
    if (!product) {
      res.status(404).json({ error: 'Proizvod nije pronađen' })
      return
    }

    // Proveri da li materijal postoji u proizvodu (fleksibilna provera)
    const materials = product.materials || ''
    const materialFound = checkMaterialExists(materials, materialName)
    
    if (!materialFound) {
      res.status(400).json({ 
        error: `Materijal "${materialName}" nije pronađen u proizvodu. Dostupni materijali: ${materials || 'Nema informacija'}` 
      })
      return
    }

    // Sačuvaj rezultat testa u bazi
    const { data: savedResult, error: saveError } = await adminSupabase
      .from('lab_test_results')
      .insert({
        product_model_id: productModelId,
        material_name: materialName,
        percentage: percentage,
        certificate_hash: certificateHash || null,
        notes: notes || null,
        tested_by: req.user.id,
        lab_name: req.profile?.full_name || 'Laborant'
      })
      .select()
      .single()

    if (saveError) {
      console.error('[Lab] Error saving test result:', saveError)
      // Ako tabela ne postoji, samo loguj (backward compatibility)
      if (saveError.code === '42P01') {
        console.warn('[Lab] Table lab_test_results does not exist. Run migration: create_lab_test_results_table.sql')
        res.json({
          success: true,
          testResult: {
            product_model_id: productModelId,
            material_name: materialName,
            percentage: percentage,
            certificate_hash: certificateHash || null,
            notes: notes || null,
            tested_by: req.user.id,
            tested_at: new Date().toISOString(),
            lab_name: req.profile?.full_name || 'Laborant'
          },
          message: 'Rezultat testa je zabeležen (tabela lab_test_results ne postoji - pokreni migraciju)',
          warning: 'Tabela lab_test_results ne postoji. Pokreni SQL migraciju.'
        })
        return
      }
      throw saveError
    }

    console.log('[Lab] Test result saved:', savedResult)

    // TODO: Pozovi smart contract da verifikuje materijal
    // const txHash = await productApprovalContract.verifyMaterial(...)

    res.json({
      success: true,
      testResult: savedResult,
      message: 'Rezultat testa je uspešno zabeležen u bazi',
      // txHash: txHash // Kada se doda blockchain integracija
    })
  } catch (error) {
    console.error('[Lab] Error verifying material:', error)
    next(error)
  }
})

/**
 * GET /api/lab/test-results/:productModelId
 * Dobija sve rezultate testova za proizvod
 */
router.get('/test-results/:productModelId', requireAuth, requireRole(['laborant', 'tester_kvaliteta', 'modni_dizajner']), async (req, res, next) => {
  try {
    const { productModelId } = req.params

    const { data, error } = await adminSupabase
      .from('lab_test_results')
      .select('*')
      .eq('product_model_id', productModelId)
      .order('created_at', { ascending: false })

    if (error) {
      // Ako tabela ne postoji, vrati prazan niz (backward compatibility)
      if (error.code === '42P01') {
        res.json({
          productModelId,
          testResults: [],
          message: 'Tabela lab_test_results ne postoji. Pokreni SQL migraciju.'
        })
        return
      }
      throw error
    }

    res.json({
      productModelId,
      testResults: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('[Lab] Error fetching test results:', error)
    next(error)
  }
})

/**
 * GET /api/lab/pending-tests
 * Dobija listu proizvoda koji čekaju testiranje
 */
router.get('/pending-tests', requireAuth, requireRole(['laborant']), async (req, res, next) => {
  try {
    // Dohvati proizvode u fazi 'testing' koji još nisu testirani
    const { data, error } = await adminSupabase
      .from('product_models')
      .select('id, name, sku, materials, development_stage')
      .eq('development_stage', 'testing')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    res.json({
      pendingTests: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('[Lab] Error fetching pending tests:', error)
    next(error)
  }
})

export default router
