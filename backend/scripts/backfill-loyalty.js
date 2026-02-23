/**
 * Skripta za naknadnu dodelu loyalty poena za stare porudžbine.
 * Pokreni iz backend foldera kada API backfill ne može (npr. 403):
 *
 *   node scripts/backfill-loyalty.js
 *
 * Zahteva .env sa SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY.
 */
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createAdminClient } from '../services/supabaseClient.js'
import { backfillLoyaltyPointsForExistingOrders } from '../services/loyaltyService.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

async function main() {
  console.log('Pokrećem backfill loyalty poena za stare porudžbine...')
  const supabase = createAdminClient()
  const result = await backfillLoyaltyPointsForExistingOrders(supabase)
  console.log('Rezultat:', result)
  console.log(`Pregledano: ${result.processed}, dodeljeno poena za: ${result.awarded} porudžbina.`)
  if (result.errors?.length) {
    console.log('Greške:', result.errors)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
