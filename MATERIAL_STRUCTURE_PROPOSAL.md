# Predlog: Precizna Struktura Materijala za Smart Contract

## Problem

Trenutno u bazi imamo:
- `"Tweed 100% vuna, Podstava od viskoze"`

**Problem:**
- Smart contract ne zna koliko je tačno viskoze u proizvodu
- Laborant mora da unese "vuna 100%" i "viskoza 100%" što nije tačno
- Viskoza je samo podstava (lining), ne glavni materijal
- Contract ne može precizno da proveri da li je "100% vuna" ako postoji i viskoza

## Rešenje: Precizna Struktura Materijala

### Opcija 1: Strukturirani Format u `materials` Polju

Umesto:
```
"Tweed 100% vuna, Podstava od viskoze"
```

Koristiti:
```
"Vuna 95%, Viskoza 5% (podstava)"
```

**Prednosti:**
- ✅ Precizni procenti za smart contract
- ✅ Jasno označeno šta je podstava
- ✅ Lako za proveru u contractu

**Nedostaci:**
- ⚠️ Gubi se informacija o tipu materijala (tweed)
- ⚠️ Format je manje čitljiv za ljude

### Opcija 2: JSON Struktura (Preporučeno) ⭐

Dodati novo polje `materials_json` u `product_models`:

```json
{
  "materials": [
    {
      "name": "Vuna",
      "percentage": 95,
      "type": "main",  // main, lining, details, trim
      "description": "Tweed tkanina"
    },
    {
      "name": "Viskoza",
      "percentage": 5,
      "type": "lining",
      "description": "Podstava"
    }
  ],
  "total_percentage": 100
}
```

**Prednosti:**
- ✅ Najpreciznije
- ✅ Lako za smart contract proveru
- ✅ Zadržava detaljne opise
- ✅ Može se dodati tip materijala (glavni/podstava/detalji)

**Nedostaci:**
- ⚠️ Zahteva migraciju baze
- ⚠️ Kompleksnije za unos

### Opcija 3: Hibridni Format (Najlakše za implementaciju) ⭐⭐⭐

Zadržati `materials` tekst polje, ali sa preciznim formatom:

```
"Vuna 95% (Tweed glavni materijal), Viskoza 5% (Podstava)"
```

Ili još preciznije:
```
"Vuna:95%:main:Tweed glavni materijal|Viskoza:5%:lining:Podstava"
```

**Prednosti:**
- ✅ Ne zahteva migraciju baze
- ✅ Precizno za smart contract
- ✅ Lako parsirati
- ✅ Zadržava opise

**Format:**
```
"Materijal:Procenat:Tip:Opis|Materijal:Procenat:Tip:Opis"
```

**Primer:**
```
"Vuna:95:main:Tweed glavni materijal|Viskoza:5:lining:Podstava"
```

## Preporuka za Tvoj Projekat

### Faza 1: Trenutno (MVP)
Koristi **Opciju 3** - hibridni format:
- Dizajner unosi: `"Vuna:95:main:Tweed|Viskoza:5:lining:Podstava"`
- Backend parsira format i ekstraktuje procente
- Smart contract proverava procente
- Frontend prikazuje lep format: "Vuna 95% (Tweed), Viskoza 5% (Podstava)"

### Faza 2: Produkcija
Migriraj na **Opciju 2** - JSON struktura:
- Dodaj `materials_json` kolonu
- Migriraj postojeće podatke
- Dodaj formu za unos sa dropdown-om za tip materijala

## Implementacija za Smart Contract

### Parsiranje Hibridnog Formata

```javascript
// Backend funkcija za parsiranje
function parseMaterials(materialsText) {
  const materials = []
  const parts = materialsText.split('|')
  
  for (const part of parts) {
    const [name, percentage, type, description] = part.split(':')
    materials.push({
      name: name.trim(),
      percentage: parseInt(percentage),
      type: type.trim(), // main, lining, details
      description: description?.trim() || ''
    })
  }
  
  return materials
}

// Primer
const materials = parseMaterials("Vuna:95:main:Tweed|Viskoza:5:lining:Podstava")
// [
//   { name: "Vuna", percentage: 95, type: "main", description: "Tweed" },
//   { name: "Viskoza", percentage: 5, type: "lining", description: "Podstava" }
// ]
```

### Provera u Smart Contractu

```solidity
// Contract proverava da li je vuna >= 95%
require(material.percentage >= 95, "Vuna mora biti najmanje 95%");
```

## Primeri za Različite Proizvode

### Proizvod 1: Tweed Blazer
**Stari format:**
```
"Tweed 100% vuna, Podstava od viskoze"
```

**Novi format (hibridni):**
```
"Vuna:95:main:Tweed glavni materijal|Viskoza:5:lining:Podstava"
```

**Prikaz na frontendu:**
```
Vuna 95% (Tweed glavni materijal)
Viskoza 5% (Podstava)
```

### Proizvod 2: Denim Jeans
**Stari format:**
```
"Denim 98% pamuk, 2% elastan"
```

**Novi format:**
```
"Pamuk:98:main:Denim tkanina|Elastan:2:main:Elastičnost"
```

### Proizvod 3: Silk Dress sa Detaljima
**Stari format:**
```
"Svila 22 momme; Viskoza postava; Metalne kopce"
```

**Novi format:**
```
"Svila:92:main:Svila 22 momme|Viskoza:5:lining:Podstava|Metal:3:details:Metalne kopce"
```

## Migracija Postojećih Podataka

SQL skripta za konverziju:

```sql
-- Primer konverzije
UPDATE product_models
SET materials = 'Vuna:95:main:Tweed glavni materijal|Viskoza:5:lining:Podstava'
WHERE materials LIKE '%Tweed 100% vuna%Podstava od viskoze%';
```

## Frontend Forma za Unos

Dodati formu u `DesignerCollectionsPage`:

```jsx
<div>
  <label>Materijali (format: Materijal:Procenat:Tip:Opis)</label>
  <input 
    placeholder="Vuna:95:main:Tweed|Viskoza:5:lining:Podstava"
    value={materials}
    onChange={handleChange}
  />
  <small>
    Format: Materijal:Procenat:Tip:Opis|Materijal:Procenat:Tip:Opis
    <br />
    Tip: main (glavni), lining (podstava), details (detalji)
  </small>
</div>
```

## Zaključak

**Preporuka:** Koristi **Opciju 3 (Hibridni Format)** za MVP:
- ✅ Ne zahteva migraciju baze
- ✅ Precizno za smart contract
- ✅ Lako implementirati
- ✅ Zadržava opise

Kasnije migriraj na JSON strukturu za produkciju.
