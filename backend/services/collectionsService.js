import { supabase, createAdminClient } from './supabaseClient.js'

// Koristimo admin client za zaobilaženje RLS problema
// Collections tabela ima RLS politiku, ali admin client može da pristupi bez problema
let dbClient
try {
  dbClient = createAdminClient()
} catch (error) {
  dbClient = supabase
}

// Funkcija za modnog dizajnera - vraća sve kolekcije koje je kreirao
export const getCollections = async (type = null) => {
  try {
    let query = dbClient
      .from('collections')
      .select('*')
      .not('created_by', 'is', null)
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('collection_type', type)
    }

    const { data, error } = await query

    if (error) {
      console.error('[CollectionsService] Error fetching collections:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('[CollectionsService] Exception in getCollections:', error)
    throw error
  }
}

// Funkcija za javne korisnike - vraća samo finalne proizvode
export const getPublicCollections = async (type = null) => {
  try {
    let query = dbClient
      .from('collections')
      .select('*')
      .eq('status', 'active')
      .not('created_by', 'is', null)
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('collection_type', type)
    }

    const { data, error } = await query

    if (error) {
      console.error('[CollectionsService] Error fetching public collections:', error)
      throw error
    }

    // Prikaži sve aktivne kolekcije koje imaju bilo kakve proizvode
    // (ne moraju biti odobreni - dovoljno je da kolekcija ima proizvode u bilo kojoj fazi)
    const collectionsWithProducts = []
    
    for (const collection of (data || [])) {
      // Proveri da li kolekcija ima bilo kakve proizvode
      const { data: models, error: modelsError } = await dbClient
        .from('product_models')
        .select('id')
        .eq('collection_id', collection.id)
        .limit(1)

      if (!modelsError && models && models.length > 0) {
        // Ima proizvode - prikaži kolekciju
        collectionsWithProducts.push(collection)
      }
    }

    return collectionsWithProducts
  } catch (error) {
    console.error('[CollectionsService] Exception in getPublicCollections:', error)
    throw error
  }
}

export const getCollectionById = async (id) => {
  const { data, error } = await dbClient
    .from('collections')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching collection by id:', error)
    throw error
  }

  return data
}

export const getCollectionProductModels = async (collectionId) => {
  const { data, error } = await dbClient
    .from('product_models')
    .select(`
      *,
      media:product_model_media(*)
    `)
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching collection product models:', error)
    throw error
  }

  return data || []
}

export const getCollectionWithProductModels = async (collectionId) => {
  const collection = await getCollectionById(collectionId)
  const productModels = await getCollectionProductModels(collectionId)

  // Grupiši modele po fazama razvoja
  const modelsByStage = {
    idea: [],
    prototype: [],
    testing: [],
    approved: []
  }

  productModels.forEach(model => {
    if (modelsByStage[model.development_stage]) {
      modelsByStage[model.development_stage].push(model)
    }
  })

  return {
    ...collection,
    productModels: productModels,
    modelsByStage: modelsByStage,
    modelsCount: productModels.length
  }
}

export const getCollectionStats = async (collectionId) => {
  const { data, error } = await dbClient
    .from('product_models')
    .select('development_stage')
    .eq('collection_id', collectionId)

  if (error) {
    console.error('Error fetching collection stats:', error)
    throw error
  }

  const stats = {
    idea: 0,
    prototype: 0,
    testing: 0,
    approved: 0,
    total: data.length
  }

  data.forEach(model => {
    if (stats.hasOwnProperty(model.development_stage)) {
      stats[model.development_stage]++
    }
  })

  return stats
}

export const getProductModelApprovals = async (modelId) => {
  const { data, error } = await dbClient
    .from('product_model_approvals')
    .select('*')
    .eq('model_id', modelId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching product model approvals:', error)
    throw error
  }

  return data || []
}

export const getProductModelComments = async (modelId) => {
  const { data, error } = await dbClient
    .from('product_model_comments')
    .select('*')
    .eq('model_id', modelId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching product model comments:', error)
    throw error
  }

  return data || []
}

export const createProductModelComment = async (modelId, commentData) => {
  try {
    const { body, author_name, role } = commentData
    
    if (!body || !body.trim()) {
      throw new Error('Tekst komentara je obavezan')
    }

    const { data, error } = await dbClient
      .from('product_model_comments')
      .insert({
        model_id: modelId,
        body: body.trim(),
        author_name: author_name || 'Modni dizajner',
        role: role || 'modni_dizajner'
      })
      .select()
      .single()

    if (error) {
      console.error('[CollectionsService] Error creating comment:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[CollectionsService] Exception in createProductModelComment:', error)
    throw error
  }
}

export const updateCollectionStatus = async (collectionId, status) => {
  try {
    const validStatuses = ['active', 'planned', 'archived']
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`)
    }

    const { data, error } = await dbClient
      .from('collections')
      .update({ status })
      .eq('id', collectionId)
      .select()
      .single()

    if (error) {
      console.error('[CollectionsService] Error updating collection status:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[CollectionsService] Exception in updateCollectionStatus:', error)
    throw error
  }
}

/**
 * Kreira proizvod u products tabeli iz odobrenog product_model
 */
export const createProductFromModel = async (modelId) => {
  try {
    console.log('[CollectionsService] createProductFromModel called for modelId:', modelId)
    
    // Proveri da li proizvod već postoji
    const { data: existingProduct, error: checkError } = await dbClient
      .from('products')
      .select('id, title, product_model_id')
      .eq('product_model_id', modelId)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[CollectionsService] Error checking existing product:', {
        error: checkError,
        code: checkError.code,
        message: checkError.message
      })
      throw checkError
    }

    if (existingProduct) {
      console.log('[CollectionsService] Product already exists for model:', {
        modelId,
        productId: existingProduct.id,
        title: existingProduct.title
      })
      return existingProduct
    }

    // Dobij product_model sa svim podacima uključujući media
    const { data: productModel, error: modelError } = await dbClient
      .from('product_models')
      .select(`
        *,
        media:product_model_media(*)
      `)
      .eq('id', modelId)
      .single()

    if (modelError) {
      console.error('[CollectionsService] Error fetching product model:', modelError)
      throw modelError
    }

    if (!productModel) {
      throw new Error(`Product model ${modelId} not found`)
    }

    // Dobij primarnu sliku ili prvu dostupnu
    const primaryImage = productModel.media?.find(m => m.is_primary) || productModel.media?.[0]
    const imageUrl = primaryImage?.image_url || 'https://via.placeholder.com/300x400'

    // Mapiraj podatke iz product_model u products format
    // Koristi cenu iz product_model ako je postavljena, inače default cena: 5000 RSD
    const DEFAULT_PRICE = 5000
    const productPrice = productModel.price && productModel.price > 0 
      ? productModel.price 
      : DEFAULT_PRICE
    
    const productData = {
      product_model_id: modelId,
      title: productModel.name || 'Proizvod bez naziva',
      description: productModel.concept || productModel.inspiration || '',
      category: productModel.category || '',
      image_url: imageUrl,
      sku: productModel.sku || null,
      price: productPrice, // Koristi cenu iz product_model ili default
      sastav: productModel.materials || '',
      odrzavanje: 'Prati ručno do 30°C; Ne koristiti izbeljivač; Peglati na niskoj temperaturi', // Default ili iz tech_notes
      poreklo: 'Proizvedeno u Srbiji' // Default vrednost
    }

    // Ako ima tech_notes, možemo pokušati da izvučemo održavanje
    if (productModel.tech_notes) {
      // Možemo dodati logiku za parsiranje tech_notes ako je potrebno
      // Za sada koristimo default vrednost
    }

    console.log('[CollectionsService] Product data to insert:', {
      title: productData.title,
      category: productData.category,
      price: productData.price,
      hasImage: !!productData.image_url,
      imageUrl: productData.image_url
    })

    // Kreiraj proizvod
    const { data: newProduct, error: insertError } = await dbClient
      .from('products')
      .insert(productData)
      .select()
      .single()

    if (insertError) {
      console.error('[CollectionsService] Error creating product:', {
        error: insertError,
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        productData
      })
      throw insertError
    }

    console.log('[CollectionsService] Successfully created product from model:', {
      productId: newProduct.id,
      title: newProduct.title,
      category: newProduct.category,
      price: newProduct.price
    })
    return newProduct
  } catch (error) {
    console.error('[CollectionsService] Exception in createProductFromModel:', error)
    throw error
  }
}

/**
 * Ažurira development_stage proizvoda (npr. iz 'testing' u 'approved')
 */
export const updateProductModelStage = async (modelId, stage, approvedBy = null) => {
  try {
    const validStages = ['idea', 'prototype', 'testing', 'approved']
    if (!validStages.includes(stage)) {
      throw new Error(`Invalid stage: ${stage}. Must be one of: ${validStages.join(', ')}`)
    }

    console.log('[CollectionsService] Updating product model stage:', { modelId, stage, approvedBy })

    if (!dbClient) {
      throw new Error('Database client nije inicijalizovan')
    }

    const updateData = {
      development_stage: stage,
      updated_at: new Date().toISOString()
    }

    console.log('[CollectionsService] Update data:', updateData)
    console.log('[CollectionsService] Model ID:', modelId)

    const { data, error } = await dbClient
      .from('product_models')
      .update(updateData)
      .eq('id', modelId)
      .select()
      .single()

    if (error) {
      console.error('[CollectionsService] Error updating product model stage:', error)
      console.error('[CollectionsService] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      // Formatiraj grešku za bolje razumevanje
      const errorMessage = error.message || 'Greška pri ažuriranju statusa proizvoda'
      const formattedError = new Error(errorMessage)
      formattedError.code = error.code
      formattedError.details = error.details
      formattedError.hint = error.hint
      throw formattedError
    }

    console.log('[CollectionsService] Successfully updated product model stage:', data)

    // Ako je odobren, dodaj zapis u product_model_approvals i kreiraj proizvod u products tabeli
    if (stage === 'approved' && approvedBy) {
      try {
        const { error: approvalError } = await dbClient
          .from('product_model_approvals')
          .insert({
            model_id: modelId,
            approval_item: 'Final Quality Approval',
            status: 'approved',
            note: 'Proizvod odobren od strane testera kvaliteta',
            approved_by: approvedBy
          })

        if (approvalError) {
          console.error('[CollectionsService] Error creating approval record:', approvalError)
          // Ne bacamo grešku - glavna operacija je uspešna
        }
      } catch (err) {
        console.error('[CollectionsService] Exception creating approval record:', err)
        // Ne bacamo grešku - glavna operacija je uspešna
      }

      // Automatski kreiraj proizvod u products tabeli
      try {
        console.log('[CollectionsService] Attempting to create product from approved model:', modelId)
        const createdProduct = await createProductFromModel(modelId)
        console.log('[CollectionsService] Product successfully created in store:', {
          productId: createdProduct.id,
          title: createdProduct.title,
          category: createdProduct.category,
          price: createdProduct.price
        })
      } catch (productErr) {
        console.error('[CollectionsService] Error creating product in store:', {
          modelId,
          error: productErr.message,
          stack: productErr.stack,
          details: productErr.details || productErr.hint || 'No additional details'
        })
        // Ne bacamo grešku - glavna operacija (odobrenje) je uspešna
        // Proizvod može biti kreiran ručno kasnije ako je potrebno
      }
    }

    return data
  } catch (error) {
    console.error('[CollectionsService] Exception in updateProductModelStage:', error)
    throw error
  }
}

/**
 * Ažurira product model – dozvoljeno samo ako nije odobren (development_stage !== 'approved')
 * Samo modni dizajner može da edituje.
 */
export const updateProductModel = async (modelId, updateData) => {
  try {
    const { data: existing, error: fetchError } = await dbClient
      .from('product_models')
      .select('development_stage')
      .eq('id', modelId)
      .single()

    if (fetchError || !existing) {
      throw new Error('Model nije pronađen')
    }

    if (existing.development_stage === 'approved') {
      throw new Error('Odobren model ne može biti izmenjen. Kontaktirajte administratora ako je potrebna izmena.')
    }

    const allowedFields = [
      'name', 'sku', 'category', 'concept', 'inspiration',
      'color_palette', 'variants', 'pattern_notes', 'materials',
      'size_table', 'tech_notes', 'price'
    ]

    const filtered = {}
    for (const key of allowedFields) {
      if (updateData.hasOwnProperty(key)) {
        filtered[key] = updateData[key]
      }
    }

    if (Object.keys(filtered).length === 0) {
      throw new Error('Nema podataka za ažuriranje')
    }

    filtered.updated_at = new Date().toISOString()

    const { data, error } = await dbClient
      .from('product_models')
      .update(filtered)
      .eq('id', modelId)
      .select()
      .single()

    if (error) {
      console.error('[CollectionsService] Error updating product model:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[CollectionsService] Exception in updateProductModel:', error)
    throw error
  }
}

/**
 * Dobija detalje proizvoda po ID-u
 */
export const getProductModelById = async (modelId) => {
  const { data, error } = await dbClient
    .from('product_models')
    .select('*')
    .eq('id', modelId)
    .single()

  if (error) {
    // Ako je greška "PGRST116" (no rows returned), vrati null umesto da baci grešku
    if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
      console.log('[CollectionsService] Product model not found:', modelId)
      return null
    }
    console.error('[CollectionsService] Error fetching product model:', error)
    throw error
  }

  return data
}

/**
 * Dobija aktivne kolekcije sa brojem odobrenih proizvoda za stranicu "Nove kolekcije"
 */
export const getNewCollections = async () => {
  try {
    // Dobijamo sve aktivne kolekcije
    const { data: activeCollections, error: collectionsError } = await dbClient
      .from('collections')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (collectionsError) {
      console.error('[CollectionsService] Error fetching active collections:', collectionsError)
      throw collectionsError
    }

    if (!activeCollections || activeCollections.length === 0) {
      return []
    }

    // Za svaku kolekciju dobijamo broj odobrenih proizvoda
    const collectionsWithStats = await Promise.all(
      activeCollections.map(async (collection) => {
        const { data: approvedModels, error: modelsError } = await dbClient
          .from('product_models')
          .select('id')
          .eq('collection_id', collection.id)
          .eq('development_stage', 'approved')

        const approvedCount = modelsError ? 0 : (approvedModels?.length || 0)

        // Vraćamo kolekciju samo ako ima odobrene proizvode
        if (approvedCount > 0) {
          return {
            ...collection,
            approved_count: approvedCount
          }
        }
        return null
      })
    )

    // Filtriramo kolekcije koje imaju odobrene proizvode
    return collectionsWithStats.filter(c => c !== null)
  } catch (error) {
    console.error('[CollectionsService] Exception in getNewCollections:', error)
    throw error
  }
}

/**
 * Kreira proizvode za sve odobrene modele koji još nisu kreirani u products tabeli
 */
export const createProductsForApprovedModels = async () => {
  try {
    console.log('[CollectionsService] Creating products for all approved models...')
    
    // Dobij sve odobrene modele
    const { data: approvedModels, error: modelsError } = await dbClient
      .from('product_models')
      .select('id')
      .eq('development_stage', 'approved')

    if (modelsError) {
      console.error('[CollectionsService] Error fetching approved models:', modelsError)
      throw modelsError
    }

    if (!approvedModels || approvedModels.length === 0) {
      console.log('[CollectionsService] No approved models found')
      return { created: 0, skipped: 0, errors: [] }
    }

    console.log(`[CollectionsService] Found ${approvedModels.length} approved models`)

    const results = {
      created: 0,
      skipped: 0,
      errors: []
    }

    // Za svaki odobren model, pokušaj da kreiraš proizvod
    for (const model of approvedModels) {
      try {
        const product = await createProductFromModel(model.id)
        if (product) {
          results.created++
          console.log(`[CollectionsService] Created product for model ${model.id}`)
        }
      } catch (err) {
        // Proveri da li je greška zbog toga što proizvod već postoji
        if (err.message && err.message.includes('already exists')) {
          results.skipped++
        } else {
          results.errors.push({
            modelId: model.id,
            error: err.message || 'Unknown error'
          })
          console.error(`[CollectionsService] Error creating product for model ${model.id}:`, err.message)
        }
      }
    }

    console.log('[CollectionsService] Finished creating products:', results)
    return results
  } catch (error) {
    console.error('[CollectionsService] Exception in createProductsForApprovedModels:', error)
    throw error
  }
}

/**
 * Dobija samo odobrene proizvode iz određene kolekcije
 */
export const getApprovedProductsFromCollection = async (collectionId) => {
  try {
    // Proveravamo da li je kolekcija aktivna
    const { data: collection, error: collectionError } = await dbClient
      .from('collections')
      .select('*')
      .eq('id', collectionId)
      .eq('status', 'active')
      .single()

    if (collectionError || !collection) {
      throw new Error('Kolekcija nije pronađena ili nije aktivna')
    }

    // Dobijamo sve odobrene proizvode iz kolekcije
    const { data: approvedModels, error: modelsError } = await dbClient
      .from('product_models')
      .select(`
        *,
        media:product_model_media(*)
      `)
      .eq('collection_id', collectionId)
      .eq('development_stage', 'approved')
      .order('created_at', { ascending: false })

    if (modelsError) {
      console.error('[CollectionsService] Error fetching approved products:', modelsError)
      throw modelsError
    }

    console.log(`[CollectionsService] Found ${approvedModels?.length || 0} approved models for collection ${collectionId}`)

    // Za svaki model, proveri da li postoji proizvod u products tabeli i kreiraj ga ako ne postoji
    const formattedProducts = await Promise.all(
      (approvedModels || []).map(async (model) => {
        console.log(`[CollectionsService] Processing model: ${model.id} (${model.name})`)
        
        // Proveri da li postoji proizvod u products tabeli za ovaj model
        let existingProduct = null
        const { data: productCheck, error: checkError } = await dbClient
          .from('products')
          .select('id')
          .eq('product_model_id', model.id)
          .maybeSingle()
        
        if (checkError && checkError.code !== 'PGRST116') {
          console.error(`[CollectionsService] Error checking for existing product:`, checkError)
        }
        
        existingProduct = productCheck

        if (existingProduct) {
          console.log(`[CollectionsService] Product already exists for model ${model.id}: ${existingProduct.id}`)
        } else {
          // Ako proizvod ne postoji, automatski ga kreiram
          try {
            console.log(`[CollectionsService] Auto-creating product for approved model: ${model.id}`)
            const createdProduct = await createProductFromModel(model.id)
            if (createdProduct && createdProduct.id) {
              existingProduct = { id: createdProduct.id }
              console.log(`[CollectionsService] Successfully auto-created product: ${createdProduct.id} for model ${model.id}`)
            } else {
              console.error(`[CollectionsService] Created product but no ID returned for model ${model.id}`)
            }
          } catch (createErr) {
            console.error(`[CollectionsService] Error auto-creating product for model ${model.id}:`, {
              error: createErr.message,
              stack: createErr.stack,
              details: createErr.details || createErr.hint
            })
            // Nastavljamo sa model.id ako kreiranje ne uspe
          }
        }

        const primaryImage = model.media?.find(m => m.is_primary) || model.media?.[0]
        
        const productId = existingProduct?.id || model.id
        console.log(`[CollectionsService] Returning product with ID: ${productId} (hasProduct: ${!!existingProduct})`)
        
        return {
          id: productId, // Koristi ID iz products ako postoji, inače ID iz modela
          product_model_id: model.id, // Zadrži i ID modela za reference
          title: model.name || 'Proizvod bez naziva',
          description: model.concept || model.inspiration || '',
          category: model.category || '',
          image_url: primaryImage?.image_url || 'https://via.placeholder.com/300x400',
          sku: model.sku || '',
          collection_id: model.collection_id,
          collection_name: collection.name,
          price: model.price && model.price > 0 ? model.price : 0,
          sastav: model.materials || '',
          created_at: model.created_at,
          color_palette: model.color_palette || '',
          variants: model.variants || '',
          hasProduct: !!existingProduct // Flag da znamo da li proizvod postoji u products tabeli
        }
      })
    )

    console.log(`[CollectionsService] Returning ${formattedProducts.length} products for collection ${collectionId}`)

    return {
      collection: collection,
      products: formattedProducts
    }
  } catch (error) {
    console.error('[CollectionsService] Exception in getApprovedProductsFromCollection:', error)
    throw error
  }
}
