# Migracija Formata Materijala

## Šta je promenjeno

### Stari format:
```
"Tweed 100% vuna, Podstava od viskoze"
"Lan 280g, Podstava od pamuka"
"Viskonza 180g, Podstava"
```

### Novi format:
```
"Vuna 95%, Viskoza 5%"
"Lan 95%, Pamuk 5%"
"Viskoza 100%"
```

## Format pravila

- **Jednostavno:** `"Materijal1 X%, Materijal2 Y%"`
- **Precizno:** Svaki materijal ima tačan procenat
- **Bez dodatnih informacija:** Nema "glavni materijal", "podstava", itd.
- **Ispravka pravopisa:** "Podstava" → uklonjeno (samo procenti)

## Primeri konverzije

| Stari Format | Novi Format |
|--------------|-------------|
| `"Tweed 100% vuna, Podstava od viskoze"` | `"Vuna 95%, Viskoza 5%"` |
| `"Vuna 70%, Poliester 30%, Podstava od viskoze"` | `"Vuna 70%, Poliester 30%"` |
| `"Lan 280g, Podstava od pamuka"` | `"Lan 95%, Pamuk 5%"` |
| `"Pamuk 100%, Podstava"` | `"Pamuk 100%"` |
| `"Denim 98% pamuk, 2% elastan"` | `"Pamuk 98%, Elastan 2%"` |

## SQL Migracija

Pokreni SQL migraciju u Supabase:

```sql
-- Fajl: supabase/update_materials_format.sql
```

Migracija ažurira sve proizvode sa novim formatom.

## Kako funkcioniše

### 1. Parsiranje
```javascript
parseMaterials("Vuna 95%, Viskoza 5%")
// [
//   { name: "Vuna", percentage: 95 },
//   { name: "Viskoza", percentage: 5 }
// ]
```

### 2. Prikaz na frontendu
```
Materijali:
• Vuna 95%
• Viskoza 5%
```

### 3. Smart Contract provera
Contract proverava da li materijali odgovaraju formatu i procentima.

## Prednosti

✅ **Precizno** - Svaki materijal ima tačan procenat
✅ **Jednostavno** - Lako za unos i čitanje
✅ **Smart contract friendly** - Lako parsirati i proveriti
✅ **Bez dodatnih informacija** - Samo ono što je potrebno

## Napomene

- Procenti ne moraju da se sabiraju do 100% (može biti 95% + 5% = 100%)
- Format je fleksibilan - može biti "Vuna 95%, Viskoza 5%" ili "Vuna 95%, Viskoza 5%, Metal 1%"
- Parser automatski ekstraktuje procente iz formata
