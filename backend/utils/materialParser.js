/**
 * Backend utility funkcije za parsiranje materijala
 * Format: "Materijal1 X%, Materijal2 Y%"
 * Primer: "Vuna 95%, Viskoza 5%"
 */

/**
 * Parsira jednostavni format materijala sa procentima
 * @param {string} materialsText - Format: "Vuna 95%, Viskoza 5%"
 * @returns {Array} Niz objekata sa materijalima
 */
export const parseMaterials = (materialsText) => {
  if (!materialsText || !materialsText.trim()) {
    return []
  }

  const materials = []
  // Podeli po zarezu ili tački-zarezu
  const parts = materialsText.split(/[,;]/).map(p => p.trim()).filter(Boolean)

  for (const part of parts) {
    // Proveri da li ima procenat (npr. "Vuna 95%" ili "Vuna 95")
    const percentageMatch = part.match(/(\d+)\s*%?/)
    const percentage = percentageMatch ? parseInt(percentageMatch[1]) : null
    
    // Izdvoji ime materijala (sve pre broja)
    const name = percentageMatch 
      ? part.substring(0, percentageMatch.index).trim()
      : part.trim()

    if (name) {
      materials.push({
        name: name,
        percentage: percentage
      })
    }
  }

  return materials
}

/**
 * Proverava da li materijal postoji u tekstu (fleksibilna provera)
 * Radi sa jedninom/množinom i case-insensitive
 */
export const checkMaterialExists = (materialsText, materialName) => {
  if (!materialsText || !materialName) return false
  
  const materialsLower = materialsText.toLowerCase()
  const materialLower = materialName.toLowerCase()
  
  // Direktna provera (case-insensitive)
  if (materialsLower.includes(materialLower)) {
    return true
  }
  
  // Provera sa jedninom/množinom (srpski jezik)
  const pluralMap = {
    'vuna': 'vune',
    'vune': 'vuna',
    'viskoza': 'viskoze',
    'viskoze': 'viskoza',
    'pamuk': 'pamuka',
    'pamuka': 'pamuk',
    'lan': 'lana',
    'lana': 'lan',
    'svila': 'svile',
    'svile': 'svila',
    'poliester': 'poliestera',
    'poliestera': 'poliester',
    'elastan': 'elastana',
    'elastana': 'elastan',
    'najlon': 'najlona',
    'najlona': 'najlon'
  }
  
  // Proveri sa alternativnim oblikom (jednina/množina)
  const alternativeForm = pluralMap[materialLower]
  if (alternativeForm && materialsLower.includes(alternativeForm)) {
    return true
  }
  
  // Proveri da li se materijal nalazi kao deo reči
  const singularForms = [
    materialLower,
    materialLower.replace(/e$/, 'a'), // viskoze -> viskoza
    materialLower.replace(/a$/, 'e'), // viskoza -> viskoze
    materialLower.replace(/i$/, ''),  // vuni -> vuna
    materialLower + 'e',              // vuna -> vune
    materialLower.replace(/e$/, '')   // viskoze -> viskoz
  ]
  
  for (const form of singularForms) {
    if (materialsLower.includes(form) && form.length >= 3) {
      return true
    }
  }
  
  return false
}

/**
 * Ekstraktuje procenat materijala iz teksta
 * @param {string} materialsText - Format: "Vuna 95%, Viskoza 5%"
 * @param {string} materialName - Ime materijala za proveru (npr. "Vuna")
 * @returns {number|null} Procenat materijala ili null ako nije pronađen
 */
export const getMaterialPercentage = (materialsText, materialName) => {
  if (!materialsText || !materialName) return null

  const materials = parseMaterials(materialsText)
  const material = materials.find(m => 
    m.name.toLowerCase().includes(materialName.toLowerCase()) ||
    materialName.toLowerCase().includes(m.name.toLowerCase())
  )

  return material?.percentage || null
}

/**
 * Proverava da li procenti materijala u zbiru daju 100%
 * @param {string} materialsText - Format: "Vuna 95%, Viskoza 5%"
 * @returns {object} { isValid: boolean, total: number, materials: Array, error: string|null }
 */
export const validateMaterialsTotal = (materialsText) => {
  if (!materialsText) {
    return { isValid: false, total: 0, materials: [], error: 'Nema materijala' }
  }

  const materials = parseMaterials(materialsText)
  const total = materials.reduce((sum, m) => sum + (m.percentage || 0), 0)
  
  return {
    isValid: total === 100,
    total: total,
    materials: materials,
    error: total !== 100 ? `Procenti materijala ne daju 100% (trenutno: ${total}%)` : null
  }
}
