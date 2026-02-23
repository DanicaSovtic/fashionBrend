/**
 * Loyalty program: Silver, Gold, Platinum
 * - Poeni se dobijaju pri kupovini (1 poen na svakih 100 RSD, × multiplier po nivou)
 * - Nivo se računa od poena u poslednjih 12 meseci (purchase events)
 * - points_balance = poeni za iskoristi (purchase dodaje, redemption oduzima)
 */

const POINTS_PER_100_RSD = 1 // 1 poen na 100 RSD potrošnje
const MIN_POINTS_TO_REDEEM = 100 // minimum poena da bi mogao da iskoristi
const MAX_REDEEM_PERCENT = 20 // max % vrednosti porudžbine koji poeni mogu da pokriju (npr. 20%)

/**
 * Vrati konfiguraciju nivoa (pragovi, multiplikatori)
 */
export async function getTierConfig(supabase) {
  const { data, error } = await supabase
    .from('loyalty_tier_config')
    .select('*')
    .order('min_points_12m', { ascending: true })
  if (error) throw error
  return data || []
}

/**
 * Izračunaj poene u poslednjih 12 meseci (samo purchase) za tier
 */
export async function getPointsEarnedLast12Months(supabase, userId) {
  const since = new Date()
  since.setMonth(since.getMonth() - 12)
  const sinceIso = since.toISOString()

  const { data, error } = await supabase
    .from('loyalty_events')
    .select('points')
    .eq('user_id', userId)
    .eq('event_type', 'purchase')
    .gte('created_at', sinceIso)

  if (error) throw error
  const sum = (data || []).reduce((acc, row) => acc + (row.points || 0), 0)
  return sum
}

/**
 * Odredi tier na osnovu poena u 12 m (config: min_points_12m)
 */
export async function computeTierFromPoints(supabase, points12m) {
  const config = await getTierConfig(supabase)
  let tier = 'silver'
  for (const row of config) {
    if (points12m >= row.min_points_12m) tier = row.tier
  }
  return tier
}

/**
 * Dohvati ili kreiraj loyalty nalog; ažuriraj tier na osnovu 12m poena
 */
export async function getOrCreateAccount(supabase, userId) {
  const { data: account, error: fetchError } = await supabase
    .from('loyalty_accounts')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

  const points12m = await getPointsEarnedLast12Months(supabase, userId)
  const tier = await computeTierFromPoints(supabase, points12m)
  const now = new Date().toISOString()

  if (account) {
    if (account.tier !== tier) {
      await supabase
        .from('loyalty_accounts')
        .update({ tier, updated_at: now })
        .eq('user_id', userId)
    }
    return {
      ...account,
      tier,
      points_earned_12m: points12m
    }
  }

  const { data: newAccount, error: insertError } = await supabase
    .from('loyalty_accounts')
    .insert({
      user_id: userId,
      tier,
      points_balance: 0,
      updated_at: now
    })
    .select()
    .single()

  if (insertError) throw insertError
  return {
    ...newAccount,
    points_earned_12m: points12m
  }
}

/**
 * Dodeli poene za porudžbinu (poziva se kada je order ready_for_shipping i još nisu dodeljeni)
 * orderId, userId, totalPrice (broj)
 */
export async function awardPointsForOrder(supabase, { orderId, userId, totalPrice }) {
  const { data: existing } = await supabase
    .from('loyalty_events')
    .select('id')
    .eq('order_id', orderId)
    .eq('event_type', 'purchase')
    .limit(1)
    .single()

  if (existing) return null // već dodeljeno

  const account = await getOrCreateAccount(supabase, userId)
  const multiplier = await getMultiplierForTier(supabase, account.tier)
  const rawPoints = Math.floor((Number(totalPrice) || 0) / 100) * POINTS_PER_100_RSD
  const points = Math.round(rawPoints * multiplier)

  if (points <= 0) return null

  const { error: eventError } = await supabase
    .from('loyalty_events')
    .insert({
      user_id: userId,
      order_id: orderId,
      points,
      event_type: 'purchase'
    })

  if (eventError) throw eventError

  const { data: acc } = await supabase
    .from('loyalty_accounts')
    .select('points_balance')
    .eq('user_id', userId)
    .single()

  const newBalance = (acc?.points_balance || 0) + points
  await supabase
    .from('loyalty_accounts')
    .update({ points_balance: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  const points12m = await getPointsEarnedLast12Months(supabase, userId)
  const newTier = await computeTierFromPoints(supabase, points12m)
  if (account.tier !== newTier) {
    await supabase
      .from('loyalty_accounts')
      .update({ tier: newTier, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
  }

  return { points, newTier, previousTier: account.tier }
}

async function getMultiplierForTier(supabase, tier) {
  const { data } = await supabase
    .from('loyalty_tier_config')
    .select('multiplier')
    .eq('tier', tier)
    .single()
  return Number(data?.multiplier) || 1
}

/**
 * Koliko popusta mogu da iskoriste (u RSD) za dati balance i order total
 * Pravilo: min MIN_POINTS_TO_REDEEM, max MAX_REDEEM_PERCENT % od totala
 * Konverzija: npr. 1 poen = 10 RSD popusta (možeš promeniti)
 */
const REDEEM_VALUE_PER_POINT_RSD = 10

export function getMaxRedeemAmount(pointsBalance, orderTotalRsd) {
  if (pointsBalance < MIN_POINTS_TO_REDEEM) return { discountRsd: 0, pointsUsed: 0 }
  const maxByPercent = (Number(orderTotalRsd) || 0) * (MAX_REDEEM_PERCENT / 100)
  const maxByPoints = pointsBalance * REDEEM_VALUE_PER_POINT_RSD
  const discountRsd = Math.min(maxByPercent, maxByPoints)
  const pointsUsed = Math.floor(discountRsd / REDEEM_VALUE_PER_POINT_RSD)
  return {
    discountRsd: Math.round(discountRsd),
    pointsUsed,
    valuePerPoint: REDEEM_VALUE_PER_POINT_RSD
  }
}

/**
 * Iskoristi poene pri porudžbini: upiše redemption event i umanji balance
 */
export async function redeemPoints(supabase, { userId, orderId, pointsToRedeem, orderTotalRsd }) {
  if (pointsToRedeem < MIN_POINTS_TO_REDEEM) {
    throw new Error(`Minimum ${MIN_POINTS_TO_REDEEM} poena za iskoristi`)
  }

  const { data: account, error: accError } = await supabase
    .from('loyalty_accounts')
    .select('points_balance')
    .eq('user_id', userId)
    .single()

  if (accError || !account) throw new Error('Loyalty nalog nije pronađen')
  if (account.points_balance < pointsToRedeem) throw new Error('Nedovoljno poena')

  const { discountRsd, pointsUsed } = getMaxRedeemAmount(account.points_balance, orderTotalRsd)
  const actualRedeem = Math.min(pointsToRedeem, pointsUsed)
  if (actualRedeem <= 0) throw new Error('Ne možete iskoristiti poene za ovu porudžbinu (limit ili minimum)')

  const { error: eventError } = await supabase
    .from('loyalty_events')
    .insert({
      user_id: userId,
      order_id: orderId,
      points: -actualRedeem,
      event_type: 'redemption'
    })

  if (eventError) throw eventError

  const newBalance = account.points_balance - actualRedeem
  await supabase
    .from('loyalty_accounts')
    .update({ points_balance: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  const discountRsdActual = actualRedeem * REDEEM_VALUE_PER_POINT_RSD
  return { pointsUsed: actualRedeem, discountRsd: discountRsdActual }
}

/**
 * Naknadna dodela poena za stare porudžbine (bez loyalty_events purchase za taj order_id).
 * Koristi se kada su porudžbine nastale pre uvođenja loyalty programa ili poeni nisu dodeljeni.
 */
export async function backfillLoyaltyPointsForExistingOrders(supabase) {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, user_id, total_price, status')
    .not('user_id', 'is', null)
    .in('status', ['ready_for_shipping', 'delivered'])

  if (ordersError) throw ordersError
  if (!orders || orders.length === 0) return { processed: 0, awarded: 0, errors: [] }

  const { data: existingEvents } = await supabase
    .from('loyalty_events')
    .select('order_id')
    .eq('event_type', 'purchase')
    .not('order_id', 'is', null)

  const awardedOrderIds = new Set((existingEvents || []).map((e) => e.order_id))

  let awarded = 0
  const errors = []

  for (const order of orders) {
    if (awardedOrderIds.has(order.id)) continue
    try {
      const result = await awardPointsForOrder(supabase, {
        orderId: order.id,
        userId: order.user_id,
        totalPrice: order.total_price
      })
      if (result) {
        awarded++
        awardedOrderIds.add(order.id)
      }
    } catch (e) {
      errors.push({ orderId: order.id, error: e.message || String(e) })
    }
  }

  return { processed: orders.length, awarded, errors }
}

export {
  POINTS_PER_100_RSD,
  MIN_POINTS_TO_REDEEM,
  MAX_REDEEM_PERCENT,
  REDEEM_VALUE_PER_POINT_RSD
}
