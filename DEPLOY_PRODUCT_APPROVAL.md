# Deploy ProductApproval Smart Contract - Detaljni Vodič

## Korak 1: Priprema za Deploy

### 1.1. Otvori Remix IDE
- Idite na [https://remix.ethereum.org](https://remix.ethereum.org)
- Kliknite na "File Explorer" u levom meniju

### 1.2. Kreiraj novi fajl
- Kliknite na ikonicu "+" pored "contracts" foldera
- Nazovite fajl: `ProductApproval.sol`
- Kopiraj ceo sadržaj iz `contracts/ProductApproval.sol` u Remix

### 1.3. Kompajliranje
- Idite na "Solidity Compiler" tab (ikona sa "S" u levom meniju)
- Izaberite compiler verziju: **0.8.20 ili novija**
- Kliknite "Compile ProductApproval.sol"
- Proverite da li ima grešaka (trebalo bi da bude bez grešaka)

## Korak 2: Deploy na Sepolia Testnet

### 2.1. Poveži MetaMask
- Idite na "Deploy & Run Transactions" tab (ikona sa "Ethereum" u levom meniju)
- Izaberite "Injected Provider - MetaMask" iz dropdown-a
- MetaMask će se otvoriti - potvrdite povezivanje
- **Proverite da ste na Sepolia testnet** (gore desno u MetaMask-u)

### 2.2. Sepolia ETH za Gas
- Ako nemate Sepolia ETH, uzmite sa:
  - [https://sepoliafaucet.org](https://sepoliafaucet.org)
  - [https://faucet.free](https://faucet.free)
- Treba vam ~0.01 ETH za deploy i testiranje

### 2.3. Deploy Contracta
- U "Deploy & Run Transactions" sekciji:
  - **Contract:** Izaberite "ProductApproval.sol"
  - **Constructor parameters:**
    - `_owner`: Unesite svoju MetaMask adresu (npr. `0x1234...`)
    - `_qualityTester`: Unesite istu adresu kao owner (za testiranje)
    - **Primer:** `["0xYourMetaMaskAddress", "0xYourMetaMaskAddress"]`
  - Kliknite "Deploy"
  - Potvrdite transakciju u MetaMask-u

### 2.4. Sačuvaj Adresu Contracta
- Nakon deploy-a, kopiraj adresu contracta (npr. `0xABC123...`)
- Dodaj u `backend/.env`:
  ```env
  PRODUCT_APPROVAL_CONTRACT=0xABC123...
  ```
- Restart backend servera

## Korak 3: Testiranje u Remix-u (Opciono)

### 3.1. Test `validateTestResults` funkcije
- U "Deployed Contracts" sekciji, kliknite na "ProductApproval"
- Pronađite funkciju `validateTestResults`
- Unesite parametre:
  - `testResults`: 
    ```json
    [
      ["Vuna", 95],
      ["Viskoza", 5]
    ]
    ```
  - `requiredMaterials`: `"Vuna 95%, Viskoza 5%"`
- Kliknite "call" (view funkcija, ne troši gas)
- Trebalo bi da vrati: `true, ""`

### 3.2. Test `approveProduct` funkcije
- Pronađite funkciju `approveProduct`
- Unesite parametre:
  - `productId`: `0x0000000000000000000000000000000000000000000000000000000000000001` (ili bilo koji bytes32)
  - `testResults`: 
    ```json
    [
      ["Vuna", 95],
      ["Viskoza", 5]
    ]
    ```
  - `requiredMaterials`: `"Vuna 95%, Viskoza 5%"`
  - `currentStage`: `"testing"`
- Kliknite "transact" (troši gas)
- Potvrdite u MetaMask-u
- Proverite Events tab - trebalo bi da vidiš `ProductApproved` event

## Korak 4: Testiranje iz Aplikacije

### 4.1. Proveri Konfiguraciju
- Proveri da li je `PRODUCT_APPROVAL_CONTRACT` postavljen u `backend/.env`
- Restart backend servera ako je potrebno

### 4.2. Uloguj se kao Tester Kvaliteta
- Otvori aplikaciju
- Uloguj se kao korisnik sa ulogom `tester_kvaliteta`

### 4.3. Odobri Proizvod
- Idite na `/tester/collections`
- Izaberite kolekciju
- Izaberite proizvod u fazi "testing"
- Proverite da li se prikazuju rezultati testova od laboranta
- Kliknite "✓ Odobri proizvod (Blockchain)"
- Potvrdite transakciju u MetaMask-u
- Proverite da li je proizvod sada "approved"

## Korak 5: Provera Event-a na Etherscan-u

### 5.1. Otvori Etherscan
- Idite na [https://sepolia.etherscan.io](https://sepolia.etherscan.io)
- Unesite adresu contracta u search
- Idite na "Events" tab
- Trebalo bi da vidiš `ProductApproved` event nakon odobrenja

## Troubleshooting

### Problem: "Samo tester kvaliteta moze odobriti"
- **Rešenje:** Proveri da li je tvoja MetaMask adresa postavljena kao `qualityTester` u constructor-u

### Problem: "Materijal X nije testiran"
- **Rešenje:** Proveri da li su svi zahtevani materijali testirani u laboratoriji

### Problem: "Proizvod mora biti u fazi testiranja"
- **Rešenje:** Proveri da li je `currentStage` tačno `"testing"` (case-sensitive)

### Problem: Contract ne može da se deploy-uje
- **Rešenje:** 
  - Proveri da li imaš dovoljno Sepolia ETH za gas
  - Proveri da li je compiler verzija 0.8.20+
  - Proveri da li ima sintaksnih grešaka u contractu

## Primer Poziva iz Frontend-a

Kada tester klikne "Odobri proizvod", frontend poziva:

```javascript
const testResults = [
  { material_name: 'Vuna', percentage: 95 },
  { material_name: 'Viskoza', percentage: 5 }
]

const requiredMaterials = 'Vuna 95%, Viskoza 5%'
const productId = 'ffffffff-ffff-ffff-ffff-ffffffffffff'

await approveProductOnBlockchain(
  contractAddress,  // Iz backend/.env
  productId,
  testResults,
  requiredMaterials,
  'testing'
)
```

Smart contract će:
1. Proveriti da li je proizvod u fazi "testing" ✅
2. Proveriti da li su svi zahtevani materijali testirani ✅
3. Proveriti da li se procenti poklapaju (±5%) ✅
4. Emitovati `ProductApproved` event ✅
5. Backend će ažurirati status proizvoda na "approved" ✅

## Napomene

- **Gas Limit:** Contract može da troši ~100k-200k gas za kompleksne validacije
- **Testiranje:** Uvek testiraj na Sepolia testnet pre produkcije
- **Backend:** Ne zaboravi da restart-uješ backend nakon dodavanja `PRODUCT_APPROVAL_CONTRACT` u `.env`
