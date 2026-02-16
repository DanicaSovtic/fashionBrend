# Product Approval Smart Contract – Setup

Pametni ugovor za odobrenje proizvoda od strane testera kvaliteta. **Validacija rezultata testova se vrši u smart contractu**, ne u backend aplikaciji.

## Tok odobrenja proizvoda

1. **Laborant testira proizvod** i unosi rezultate testova u aplikaciju (npr. "Vuna 95%", "Viskoza 5%")
2. Rezultati se čuvaju u tabeli `lab_test_results` u bazi
3. **Tester kvaliteta** vidi rezultate testova na stranici za odobrenje
4. Kada tester pokuša da odobri proizvod:
   - Frontend dohvata rezultate testova iz baze
   - Poziva se smart contract `approveProduct()` sa rezultatima testova
   - **Smart contract proverava** da li rezultati testova odgovaraju zahtevanim materijalima:
     - Proverava da li su svi zahtevani materijali testirani
     - Proverava da li se procenti poklapaju (dozvoljava razliku od ±5%)
   - Ako su svi uslovi ispunjeni, smart contract emituje `ProductApproved` event
   - Backend ažurira status proizvoda na 'approved' nakon uspešne blockchain transakcije

## Smart Contract Funkcionalnost

### `approveProduct()`
```solidity
function approveProduct(
    bytes32 productId,
    TestResult[] memory testResults,
    string memory requiredMaterials,
    string memory currentStage
) external onlyTester
```

**Parametri:**
- `productId`: Hash proizvoda (keccak256 od UUID-a)
- `testResults`: Niz rezultata testova od laboranta
  ```solidity
  struct TestResult {
      string materialName; // npr. "Vuna"
      uint8 percentage;    // 0-100
  }
  ```
- `requiredMaterials`: Zahtevani materijali kao string (npr. "Vuna 95%, Viskoza 5%")
- `currentStage`: Trenutna faza proizvoda (mora biti "testing")

**Validacija u smart contractu:**
- Proverava da li je proizvod u fazi "testing"
- Proverava da li su svi zahtevani materijali testirani
- Proverava da li se procenti poklapaju (dozvoljava razliku od ±5%)
- Ako svi uslovi nisu ispunjeni, transakcija se revertuje sa porukom greške

### `validateTestResults()`
```solidity
function validateTestResults(
    TestResult[] memory testResults,
    string memory requiredMaterialsText
) public pure returns (bool, string memory)
```

Pomoćna funkcija koja proverava da li rezultati testova odgovaraju zahtevanim materijalima. Vraća `(true, "")` ako su svi uslovi ispunjeni, ili `(false, "razlog")` ako nisu.

## Deploy na Sepolia

1. Otvori `contracts/ProductApproval.sol` u [Remix](https://remix.ethereum.org)
2. Kompajliraj (Compiler 0.8.20+)
3. Deploy na Sepolia (Injected Provider – MetaMask)
4. U constructor unesi:
   - `_owner`: Adresa vlasnika brenda (tvoja MetaMask adresa)
   - `_qualityTester`: Adresa testera kvaliteta (može biti ista kao owner za testiranje)
5. Kopiraj adresu ugovora i u `backend/.env` stavi:
   ```env
   PRODUCT_APPROVAL_CONTRACT=0x...
   ```

## Konfiguracija Backend-a

U `backend/.env`:
```env
PRODUCT_APPROVAL_CONTRACT=0x... # Adresa deploy-ovanog ProductApproval.sol
```

## Migracija Baze

Pokreni SQL migraciju za kreiranje tabele `lab_test_results`:
- Fajl: `supabase/create_lab_test_results_table.sql`

## Primer Korišćenja

### Frontend poziv:
```javascript
import { approveProductOnBlockchain } from '../lib/blockchain'

// Rezultati testova od laboranta
const testResults = [
  { material_name: 'Vuna', percentage: 95 },
  { material_name: 'Viskoza', percentage: 5 }
]

// Zahtevani materijali
const requiredMaterials = 'Vuna 95%, Viskoza 5%'

// Poziv smart contracta
const txResult = await approveProductOnBlockchain(
  contractAddress,
  productId,
  testResults,
  requiredMaterials,
  'testing'
)
```

### Smart Contract Event:
```solidity
event ProductApproved(
    bytes32 indexed productId,
    address indexed tester,
    string materials,
    uint256 timestamp
)
```

## Napomene

- **Validacija se vrši u smart contractu**, ne u backend aplikaciji
- Smart contract dozvoljava razliku od ±5% između zahtevanog i testiranog procenta
- Ako validacija ne prođe, transakcija se revertuje i proizvod se ne odobrava
- Backend samo ažurira status proizvoda nakon uspešne blockchain transakcije
