/**
 * Utility funkcije za proveru da li su rezultati testova u skladu sa zahtevanim materijalima
 */

import { parseMaterials, checkMaterialExists, getMaterialPercentage } from './materialParser.js'

/**
 * Proverava da li su rezultati testova u skladu sa zahtevanim materijalima
 * @param {Array} testResults - Rezultati testova iz lab_test_results tabele
 * @param {string} requiredMaterials - Zahtevani materijali (format: "Vuna 95%, Viskoza 5%")
 * @returns {object} { isValid: boolean, errors: Array<string>, matches: Array<object> }
 */
export const validateTestResults = (testResults, requiredMaterials) => {
  if (!testResults || testResults.length === 0) {
    return {
      isValid: false,
      errors: ['Nema rezultata testova. Proizvod mora biti testiran pre odobrenja.'],
      matches: []
    }
  }

  if (!requiredMaterials || !requiredMaterials.trim()) {
    return {
      isValid: false,
      errors: ['Zahtevani materijali nisu definisani.'],
      matches: []
    }
  }

  const requiredMaterialsParsed = parseMaterials(requiredMaterials)
  const errors = []
  const matches = []

  // Za svaki zahtevani materijal, proveri da li postoji u rezultatima testova
  for (const required of requiredMaterialsParsed) {
    const testResult = testResults.find(tr => 
      checkMaterialExists(tr.material_name, required.name)
    )

    if (!testResult) {
      errors.push(`Materijal "${required.name}" nije testiran u laboratoriji.`)
      continue
    }

    // Proveri da li se procenti poklapaju (dozvoljavamo razliku od ±5%)
    const testPercentage = testResult.percentage
    const requiredPercentage = required.percentage

    if (requiredPercentage !== null) {
      const difference = Math.abs(testPercentage - requiredPercentage)
      if (difference > 5) {
        errors.push(
          `Materijal "${required.name}": zahtevano ${requiredPercentage}%, testirano ${testPercentage}% (razlika: ${difference}%)`
        )
      } else {
        matches.push({
          material: required.name,
          required: requiredPercentage,
          tested: testPercentage,
          difference: difference
        })
      }
    } else {
      // Ako nema zahtevanog procenta, samo proveri da li materijal postoji
      matches.push({
        material: required.name,
        required: null,
        tested: testPercentage,
        difference: null
      })
    }
  }

  // Proveri da li postoje rezultati testova koji nisu u zahtevanim materijalima (opciono)
  // Ovo može biti upozorenje, ali ne sprečava odobrenje

  return {
    isValid: errors.length === 0,
    errors: errors,
    matches: matches,
    testResultsCount: testResults.length,
    requiredMaterialsCount: requiredMaterialsParsed.length
  }
}

/**
 * Proverava da li proizvod ima sve potrebne rezultate testova
 * @param {string} productModelId - ID proizvoda
 * @param {string} requiredMaterials - Zahtevani materijali
 * @param {object} adminSupabase - Supabase admin client
 * @returns {Promise<object>} Rezultat validacije
 */
export const validateProductTestResults = async (productModelId, requiredMaterials, adminSupabase) => {
  try {
    // Dohvati rezultate testova za proizvod
    const { data: testResults, error } = await adminSupabase
      .from('lab_test_results')
      .select('*')
      .eq('product_model_id', productModelId)
      .order('created_at', { ascending: false })

    if (error) {
      // Ako tabela ne postoji, vrati grešku
      if (error.code === '42P01') {
        return {
          isValid: false,
          errors: ['Tabela lab_test_results ne postoji. Pokreni migraciju.'],
          matches: [],
          testResults: []
        }
      }
      throw error
    }

    // Validiraj rezultate
    const validation = validateTestResults(testResults || [], requiredMaterials)

    return {
      ...validation,
      testResults: testResults || []
    }
  } catch (error) {
    console.error('[TestResultsValidator] Error validating test results:', error)
    return {
      isValid: false,
      errors: [`Greška pri proveri rezultata testova: ${error.message}`],
      matches: [],
      testResults: []
    }
  }
}
