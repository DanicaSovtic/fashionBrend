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
const normalizeParsedMaterialName = (name) => {
  if (!name) return ''
  return String(name)
    .trim()
    .replace(/\s*-\s*$/, '')
    .trim()
}

/**
 * Isto kao backend – ime za ProductApproval (ASCII, bez dijakritika).
 * Laborant i skica mogu imati "Šifon" / "Sifon - 100%"; ugovor poredi stringove strogo.
 */
export function normalizeMaterialNameForContract(raw) {
  if (raw == null || raw === undefined) return ''
  let s = String(raw).trim()
  if (!s) return ''

  s = s.split('/')[0].trim()
  s = s.split(/\s*-\s*/)[0].trim()
  s = s.replace(/\d+\s*%.*/i, '').trim()

  s = s.toLowerCase()
  try {
    s = s.normalize('NFD').replace(/\p{M}+/gu, '')
  } catch {
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  return s.replace(/\s+/g, ' ').trim()
}

export const parseMaterials = (materialsText) => {
  if (!materialsText || !String(materialsText).trim()) {
    return []
  }

  const raw = String(materialsText).trim()

  if (raw.startsWith('[')) {
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) {
        const out = []
        for (const entry of arr) {
          if (typeof entry === 'string') {
            const n = entry.trim()
            if (n) out.push({ name: n, percentage: null, type: 'unknown', description: '' })
            continue
          }
          if (entry && typeof entry === 'object') {
            const name = normalizeParsedMaterialName(
              entry.material || entry.name || entry.label || ''
            )
            const pct =
              entry.percentage != null && entry.percentage !== ''
                ? parseInt(String(entry.percentage), 10)
                : null
            if (name) {
              out.push({
                name,
                percentage: Number.isFinite(pct) ? pct : null,
                type: entry.type || 'unknown',
                description: entry.description || ''
              })
            }
          }
        }
        if (out.length > 0) return out
      }
    } catch {
      /* nastavi kao tekst */
    }
  }

  const materials = []
  const parts = raw.split(/[,;]/).map((p) => p.trim()).filter(Boolean)

  for (const part of parts) {
    const dashPct = part.match(/^(.+?)\s*-\s*(\d+)\s*%/)
    if (dashPct) {
      const name = normalizeParsedMaterialName(dashPct[1])
      if (name) {
        materials.push({
          name,
          percentage: parseInt(dashPct[2], 10),
          type: 'unknown',
          description: ''
        })
      }
      continue
    }

    const percentageMatch = part.match(/(\d+)\s*%?/)
    const percentage = percentageMatch ? parseInt(percentageMatch[1], 10) : null

    let name = percentageMatch
      ? part.substring(0, percentageMatch.index).trim()
      : part.trim()
    name = normalizeParsedMaterialName(name)

    if (name) {
      materials.push({
        name,
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
