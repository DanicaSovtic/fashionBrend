# Vodič za Verifikaciju Materijala - Kako Smart Contract Zna da je Stvarno 100% Vuna?

## Problem sa Trenutnom Implementacijom

Trenutno `ProductApproval.sol` samo proverava **tekst** - da li string sadrži određene reči. To **NIJE prava verifikacija** jer:

- ❌ Ne proverava stvarni sastav proizvoda
- ❌ Može se lažirati unosom teksta
- ❌ Nema pouzdanog izvora podataka

## Rešenja za Pravu Verifikaciju

### 1. **Lab Testovi sa Rezultatima na Blockchainu** ⭐ Preporučeno

**Kako radi:**
- Proizvod se šalje u akreditovani laboratorij
- Lab testira sastav (npr. 100% vuna)
- Rezultati se čuvaju na blockchainu (IPFS + smart contract)
- Smart contract proverava da li su rezultati verifikovani od pouzdanog laba

**Primer:**
```solidity
// Lab šalje rezultate
lab.verifyMaterial(productId, "Vuna", 100, labCertificateHash);

// Smart contract proverava
require(material.verified == true, "Materijal nije verifikovan");
require(material.percentage >= 100, "Nije 100% vuna");
```

**Prednosti:**
- ✅ Najpouzdanije rešenje
- ✅ Nezavisna verifikacija
- ✅ Dokaz na blockchainu

**Implementacija:**
- Lab dobija adresu na blockchainu
- Lab šalje rezultate direktno na contract
- Contract čuva hash sertifikata (IPFS)

---

### 2. **Certifikati i QR Kodovi**

**Kako radi:**
- Dobavljač izdaje sertifikat za materijal
- Sertifikat se čuva na IPFS
- QR kod na proizvodu vodi do sertifikata
- Smart contract proverava hash sertifikata

**Primer:**
```solidity
// Dobavljač registruje sertifikat
supplier.registerCertificate(
    materialId,
    ipfsHash,  // Hash sertifikata na IPFS
    "100% vuna"
);

// Tester skenira QR kod i proverava
contract.verifyCertificate(qrCodeHash, ipfsHash);
```

**Prednosti:**
- ✅ Lako za implementaciju
- ✅ Korisnik može proveriti
- ✅ Transparentno

---

### 3. **Chainlink Oracles za Verifikaciju**

**Kako radi:**
- Chainlink Oracle poziva API laba/dobavljača
- Oracle šalje podatke na blockchain
- Smart contract koristi podatke iz Oracl-a

**Primer:**
```solidity
// Chainlink Oracle poziva lab API
requestId = oracle.requestLabTest(productId);

// Oracle callback sa rezultatima
function fulfillLabTest(bytes32 requestId, uint8 woolPercentage) {
    materials[productId].woolPercentage = woolPercentage;
    materials[productId].verified = true;
}
```

**Prednosti:**
- ✅ Automatska verifikacija
- ✅ Pouzdan izvor (Chainlink)
- ✅ Real-time podaci

**Nedostaci:**
- ❌ Troškovi Chainlink poziva
- ❌ Potrebna integracija sa labom

---

### 4. **Integracija sa Dobavljačima (Supplier Integration)**

**Kako radi:**
- Dobavljači imaju svoje smart contracte
- Kada šalju materijal, registruju ga na blockchainu
- Proizvođač koristi verifikovane materijale

**Primer:**
```solidity
// Dobavljač registruje materijal
supplierContract.registerMaterial(
    batchId,
    "Vuna",
    100,  // 100% vuna
    certificateHash
);

// Proizvođač koristi materijal
manufacturerContract.useMaterial(batchId, productId);

// Smart contract proverava
require(supplierContract.isVerified(batchId), "Materijal nije verifikovan");
```

**Prednosti:**
- ✅ Verifikacija na početku lanca
- ✅ Svi koriste isti materijal
- ✅ Transparentnost u lancu snabdevanja

---

### 5. **Hybrid Rešenje (Preporučeno za Produkciju)**

Kombinacija više metoda:

1. **Dobavljač** → Registruje materijal sa sertifikatom
2. **Proizvođač** → Koristi verifikovani materijal
3. **Lab** → Testira finalni proizvod
4. **Smart Contract** → Proverava sve izvore

```solidity
function approveProduct(bytes32 productId) {
    // Proverava da li je materijal od dobavljača verifikovan
    require(supplierContract.isVerified(materialBatchId), "Materijal nije od verifikovanog dobavljaca");
    
    // Proverava da li je finalni proizvod testiran u labu
    require(labContract.isTested(productId), "Proizvod nije testiran");
    
    // Proverava da li rezultati odgovaraju
    require(labContract.getWoolPercentage(productId) >= 100, "Nije 100% vuna");
    
    // Odobrava
    products[productId].approved = true;
}
```

---

## Implementacija za Tvoj Projekat

### Faza 1: Trenutno (MVP)
- ✅ Tekstualna provera (trenutna implementacija)
- ⚠️ **Napomena:** Ovo je samo za demo/testiranje

### Faza 2: Dodaj Strukturu Podataka
- Koristi `ProductApprovalV2.sol` sa strukturom `Material`
- Dodaj polje `verified` za svaki materijal
- Dodaj `trustedVerifiers` mapping

### Faza 3: Integracija sa Labom
- Lab dobija adresu na blockchainu
- Lab šalje rezultate direktno na contract
- Contract proverava da li je lab pouzdan

### Faza 4: Dodaj Certifikate
- Sertifikati na IPFS
- QR kodovi na proizvodima
- Verifikacija preko hash-a

---

## Primer Koda za Lab Verifikaciju

```javascript
// Backend - Lab API endpoint
app.post('/api/lab/verify-material', async (req, res) => {
  const { productId, materialName, percentage, certificateHash } = req.body;
  
  // Lab testira proizvod
  const testResult = await lab.testMaterial(productId, materialName);
  
  if (testResult.percentage === percentage) {
    // Šalje na blockchain
    const tx = await productApprovalContract.verifyMaterial(
      productId,
      materialIndex,
      percentage,
      { from: labWallet }
    );
    
    res.json({ success: true, txHash: tx.hash });
  } else {
    res.json({ success: false, reason: 'Materijal ne odgovara' });
  }
});
```

---

## Zaključak

**Trenutno:** Contract samo proverava tekst - **Nije prava verifikacija**

**Za produkciju:** Potrebna je kombinacija:
1. Lab testovi sa rezultatima na blockchainu
2. Certifikati od dobavljača
3. Verifikacija od pouzdanih izvora

**Preporuka:** Počni sa strukturom podataka (`ProductApprovalV2.sol`), pa dodaj lab integraciju kada budeš spreman.
