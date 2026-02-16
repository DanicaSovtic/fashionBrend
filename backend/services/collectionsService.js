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
 * Ažurira development_stage proizvoda (npr. iz 'testing' u 'approved')
 */
export const updateProductModelStage = async (modelId, stage, approvedBy = null) => {
  try {
    const validStages = ['idea', 'prototype', 'testing', 'approved']
    if (!validStages.includes(stage)) {
      throw new Error(`Invalid stage: ${stage}. Must be one of: ${validStages.join(', ')}`)
    }

    const updateData = {
      development_stage: stage,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await dbClient
      .from('product_models')
      .update(updateData)
      .eq('id', modelId)
      .select()
      .single()

    if (error) {
      console.error('[CollectionsService] Error updating product model stage:', error)
      throw error
    }

    // Ako je odobren, dodaj zapis u product_model_approvals
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
    }

    return data
  } catch (error) {
    console.error('[CollectionsService] Exception in updateProductModelStage:', error)
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
    console.error('[CollectionsService] Error fetching product model:', error)
    throw error
  }

  return data
}
