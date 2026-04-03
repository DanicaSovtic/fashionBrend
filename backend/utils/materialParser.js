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
/**
 * Normalizuje ime materijala nakon parsiranja "pre procenata".
 * Npr. "Šifon - 100% poliester" → substring do "100" daje "Šifon - " → ovde "Šifon".
 * Bez ovoga smart contract (keccak256) ne poklapa skicu sa linijom pošiljke ("Šifon").
 */
const normalizeParsedMaterialName = (name) => {
  if (!name) return ''
  return String(name)
    .trim()
    .replace(/\s*-\s*$/, '')
    .trim()
}

export const parseMaterials = (materialsText) => {
  if (!materialsText || !String(materialsText).trim()) {
    return []
  }

  const raw = String(materialsText).trim()

  // JSON niz (noviji format skice): [{ "material": "Šifon", "percentage": 100 }, ...]
  if (raw.startsWith('[')) {
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) {
        const out = []
        for (const entry of arr) {
          if (typeof entry === 'string') {
            const n = entry.trim()
            if (n) out.push({ name: n, percentage: null })
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
            if (name) out.push({ name, percentage: Number.isFinite(pct) ? pct : null })
          }
        }
        if (out.length > 0) return out
      }
    } catch {
      /* nastavi kao običan tekst */
    }
  }

  const materials = []
  // Podeli po zarezu ili tački-zarezu
  const parts = raw.split(/[,;]/).map((p) => p.trim()).filter(Boolean)

  for (const part of parts) {
    // Prvo: "Naziv - XX% ..." (čest format posle grupe / sastava)
    const dashPct = part.match(/^(.+?)\s*-\s*(\d+)\s*%/)
    if (dashPct) {
      const name = normalizeParsedMaterialName(dashPct[1])
      if (name) {
        materials.push({
          name,
          percentage: parseInt(dashPct[2], 10)
        })
      }
      continue
    }

    // Proveri da li ima procenat (npr. "Vuna 95%" ili "Vuna 95")
    const percentageMatch = part.match(/(\d+)\s*%?/)
    const percentage = percentageMatch ? parseInt(percentageMatch[1], 10) : null

    // Izdvoji ime materijala (sve pre broja), pa ukloni završnu crticu (greška za "Šifon - 100%...")
    let name = percentageMatch
      ? part.substring(0, percentageMatch.index).trim()
      : part.trim()
    name = normalizeParsedMaterialName(name)

    if (name) {
      materials.push({
        name,
        percentage: percentage
      })
    }
  }

  return materials
}

/**
 * Ključ za SupplierManufacturerContract (createShipment / acceptShipment):
 * - samo jezgro imena materijala (bez procenata, bez "poliester" iza %, bez boje/kg iz prikaza)
 * - š/s i ostali dijakritici → ASCII (Unicode NFD)
 * Procenti i pun sastav ostaju u skici za laboratoriju; ugovor ih ne poredi.
 */
export function normalizeMaterialNameForContract(raw) {
  if (raw == null || raw === undefined) return ''
  let s = String(raw).trim()
  if (!s) return ''

  // "Šifon / Roze / 5 kg" u jednom polju → samo materijal
  s = s.split('/')[0].trim()
  // "Sifon - 100% poliester" → samo deo pre crtice (procenti kasnije ignorišu)
  s = s.split(/\s*-\s*/)[0].trim()
  // "Sifon 100% ..." bez crtice
  s = s.replace(/\d+\s*%.*/i, '').trim()

  s = s.toLowerCase()
  try {
    s = s.normalize('NFD').replace(/\p{M}+/gu, '')
  } catch {
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  return s.replace(/\s+/g, ' ').trim()
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
