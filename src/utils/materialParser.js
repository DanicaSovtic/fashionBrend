/**
 * Utility funkcije za parsiranje i formatiranje materijala
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
        percentage: percentage,
        type: 'unknown',
        description: ''
      })
    }
  }

  return materials
}

/**
 * Formatira materijale za prikaz na frontendu
 * @param {string} materialsText - Format iz baze: "Vuna 95%, Viskoza 5%"
 * @returns {string} Lepo formatiran tekst za prikaz
 */
export const formatMaterialsForDisplay = (materialsText) => {
  if (!materialsText) return 'Nema informacija'

  // Ako već ima dobar format, samo vrati
  return materialsText
}

/**
 * Formatira materijale za detaljan prikaz
 * @param {string} materialsText - Format iz baze: "Vuna 95%, Viskoza 5%"
 * @returns {Array} Niz formatiranih stringova
 */
export const formatMaterialsDetailed = (materialsText) => {
  if (!materialsText) return []

  const materials = parseMaterials(materialsText)
  
  return materials.map(m => {
    let formatted = m.name
    if (m.percentage !== null) {
      formatted += ` ${m.percentage}%`
    }
    return formatted
  })
}

/**
 * Proverava da li format ima procente
 * @param {string} materialsText - Tekst materijala
 * @returns {boolean}
 */
export const hasPercentages = (materialsText) => {
  return materialsText && /\d+\s*%/.test(materialsText)
}

/**
 * Ekstraktuje procente iz materijala za smart contract proveru
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
 * @returns {object} { isValid: boolean, total: number, materials: Array }
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
