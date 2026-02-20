# Laborant Setup Guide

## Pregled

Laborant je nova uloga u sistemu koja omogućava labovima da:
- Šalju rezultate testova materijala
- Verifikuju sastav proizvoda
- Komuniciraju sa smart contractom na blockchainu

## Setup Koraci

### 1. Dodaj Ulogu u Bazu

Pokreni SQL migraciju u Supabase:

```sql
-- Pokreni u Supabase SQL Editor
-- Fajl: supabase/add_laboratorija_role.sql
```

Ili ručno:

```sql
alter table profiles
  drop constraint if exists profiles_role_check;

alter table profiles
  add constraint profiles_role_check check (
    role in (
      'superadmin',
      'modni_dizajner',
      'dobavljac_materijala',
      'proizvodjac',
      'tester_kvaliteta',
      'laborant',
      'distributer',
      'krajnji_korisnik'
    )
  );
```

### 2. Kreiraj Korisnika za Laboranta

**Opcija A: Preko Supabase Auth UI**
1. Otvori Supabase Dashboard → Authentication → Users
2. Klikni "Add User" → "Create new user"
3. Email: `lab@piccola.com` (ili tvoj email)
4. Password: Generiši siguran password
5. Potvrdi email

**Opcija B: Preko Admin Panela u Aplikaciji**
1. Login kao superadmin
2. Idi na Users stranicu
3. Klikni "Create User"
4. Popuni:
   - Email: `lab@piccola.com`
   - Full Name: `Laborant Piccola`
   - Role: `laborant`
   - Password: Generiši siguran password

**Opcija C: Direktno u Bazi**
```sql
-- Prvo kreiraj korisnika u auth.users (preko Supabase Auth API ili UI)
-- Zatim dodaj profil:
INSERT INTO profiles (user_id, full_name, role)
VALUES (
  'uuid-iz-auth-users',  -- Zameni sa stvarnim user_id
  'Laborant Piccola',
  'laborant'
);
```

### 3. Restart Backend

Backend je već ažuriran sa lab routerom. Restartuj backend:

```bash
cd backend
npm run dev
```

### 4. Testiranje

#### Test 1: Lab Login
```bash
# Login kao lab korisnik
POST /api/auth/login
{
  "email": "lab@piccola.com",
  "password": "tvoj-password"
}
```

#### Test 2: Šalji Rezultat Testa
```bash
POST /api/lab/verify-material
Headers: Authorization: Bearer <lab-token>
Body: {
  "productModelId": "uuid-proizvoda",
  "materialName": "Vuna",
  "percentage": 100,
  "certificateHash": "ipfs-hash-sertifikata",
  "notes": "Testiranje pokazuje 100% vuna"
}
```

#### Test 3: Dobij Pending Tests
```bash
GET /api/lab/pending-tests
Headers: Authorization: Bearer <lab-token>
```

## Kako Funkcioniše

### Tok Verifikacije Materijala

1. **Proizvod ide u fazu "testing"**
   - Dizajner ili proizvođač označi proizvod kao "testing"

2. **Proizvod se šalje u laboratoriju**
   - Fizički proizvod se šalje u lab
   - Lab dobija obaveštenje (email ili notifikacija)

3. **Lab testira proizvod**
   - Lab izvršava testove (npr. hemijska analiza)
   - Lab dobija rezultate (npr. 100% vuna)

4. **Lab šalje rezultate na backend**
   ```javascript
   POST /api/lab/verify-material
   {
     productModelId: "...",
     materialName: "Vuna",
     percentage: 100,
     certificateHash: "ipfs-hash"
   }
   ```

5. **Backend šalje na blockchain** (TODO)
   ```javascript
   // U lab.js routeru
   const txHash = await productApprovalContract.verifyMaterial(
     productIdBytes32,
     materialIndex,
     percentage,
     { from: labWallet }
   )
   ```

6. **Smart contract verifikuje**
   - Contract proverava da li je lab pouzdan verifier
   - Contract čuva rezultat
   - Materijal je sada "verified"

7. **Tester može odobriti proizvod**
   - Kada su svi materijali verified
   - Tester poziva `approveProduct()`
   - Contract proverava da li su svi verified
   - Proizvod je odobren ✅

## API Endpoints

### POST /api/lab/verify-material
Šalje rezultat testa materijala.

**Headers:**
- `Authorization: Bearer <token>` (lab token)

**Body:**
```json
{
  "productModelId": "uuid",
  "materialName": "Vuna",
  "percentage": 100,
  "certificateHash": "ipfs-hash-optional",
  "notes": "Testiranje pokazuje 100% vuna"
}
```

**Response:**
```json
{
  "success": true,
  "testResult": {
    "product_model_id": "uuid",
    "material_name": "Vuna",
    "percentage": 100,
    "certificate_hash": "ipfs-hash",
    "tested_by": "lab-user-id",
    "tested_at": "2026-02-16T...",
    "lab_name": "Laborant Piccola"
  },
  "message": "Rezultat testa je uspešno zabeležen"
}
```

### GET /api/lab/pending-tests
Dobija listu proizvoda koji čekaju testiranje.

**Headers:**
- `Authorization: Bearer <token>` (lab token)

**Response:**
```json
{
  "pendingTests": [
    {
      "id": "uuid",
      "name": "Tailored Tweed Blazer",
      "sku": "MD-FW26-102",
      "materials": "Tweed 100% vuna, Podstava od viskoze",
      "development_stage": "testing"
    }
  ],
  "count": 1
}
```

### GET /api/lab/test-results/:productModelId
Dobija sve rezultate testova za proizvod.

**Headers:**
- `Authorization: Bearer <token>` (lab, tester, ili dizajner token)

**Response:**
```json
{
  "productModelId": "uuid",
  "testResults": [
    {
      "material_name": "Vuna",
      "percentage": 100,
      "certificate_hash": "ipfs-hash",
      "tested_by": "lab-user-id",
      "tested_at": "2026-02-16T..."
    }
  ]
}
```

## Frontend Stranica za Lab (TODO)

Može se kreirati stranica `/lab/dashboard` gde lab može:
- Videti pending tests
- Uneti rezultate testova
- Pregledati istoriju testova

## Blockchain Integracija (TODO)

Kada budeš spreman, dodaj poziv smart contracta u `lab.js`:

```javascript
import { approveProductOnBlockchain } from '../lib/blockchain.js'

// U POST /api/lab/verify-material
const txHash = await productApprovalContract.verifyMaterial(
  productIdBytes32,
  materialIndex,
  percentage,
  { from: labWalletAddress }
)
```

## Napomene

- Lab mora biti "trusted verifier" u smart contractu
- Lab wallet adresa se dodaje u contract preko `addTrustedVerifier()`
- Rezultati testova se mogu čuvati u novoj tabeli `lab_test_results`
- Certifikati se čuvaju na IPFS, hash se šalje na blockchain

## Sledeći Koraci

1. ✅ Dodaj ulogu u bazu
2. ✅ Kreiraj lab korisnika
3. ✅ Testiraj API endpoints
4. ⏳ Kreiraj frontend stranicu za lab
5. ⏳ Dodaj tabelu `lab_test_results` u bazu
6. ⏳ Integriši blockchain poziv
7. ⏳ Dodaj lab wallet u smart contract kao trusted verifier
