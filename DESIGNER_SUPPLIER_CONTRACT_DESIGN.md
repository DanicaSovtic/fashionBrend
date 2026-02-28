# Ugovor između modnog dizajnera i dobavljača materijala – dizajn

## Učesnici

- **Modni dizajner** = vlasnik brenda (wallet koji već koristimo). Inicira zahtev za materijal.
- **Dobavljač materijala** = prima zahtev, prihvata ugovor i prima plaćanje ako su uslovi ispunjeni.

## Tok (kako ti želiš)

1. Dizajner se uloguje, izabere model u fazi **ideja** (npr. Linen Midi Dress – Lan 95%, Pamuk 5%).
2. Na kartici **Razvoj modela** nađe haljinu u fazi ideje i klikne **„Zatraži materijal”**.
3. U tom trenutku **inicira se ugovor**: dizajner šalje uslove – npr. 10 kg lana, 5 kg pamuka (količine na veliko; procenti iz skice koriste kasnije proizvođač).
4. Dobavljač se uloguje, vidi zahtev i **prihvata** ga. Sa njegove strane to = prihvatanje ugovora.
5. **Logika ugovora**:
   - Provera 1: dobavljač ima dovoljno materijala (npr. 10 kg lana, 5 kg pamuka).
   - Provera 2: dizajner ima dovoljno sredstava da plati (ukupan iznos po cenama dobavljača).
6. Cenu materijala određuje **dobavljač** (npr. 1000 RSD/kg za neki materijal). Ukupan iznos = suma (količina_i × cena_po_kg_i).
7. Ako su oba uslova ispunjena:
   - ugovor se **izvršava**,
   - novac se **prenosi na račun dobavljača** (u našem slučaju na njegov wallet).
8. Slanje materijala od dobavljača proizvođaču – drugi ugovor, kasnije.

---

## Odluke za implementaciju

### 1. Količine

- Dizajner naručuje u **kg** (npr. 10 kg lana, 5 kg pamuka).
- Procenti iz modela (Lan 95%, Pamuk 5%) služe proizvođaču za razvoj; za ovaj ugovor bitne su samo **količine u kg** koje dizajner unosi pri „Zatraži materijal”.

### 2. Cene

- Cenu po kg za svaki materijal definiše **dobavljač** (u bazi / na backendu, npr. `inventory_items.price_per_kg`).
- Ukupan iznos za ugovor računamo u backendu:  
  `total = Σ (quantity_kg_i × price_per_kg_i)` za sve stavke u zahtevu.
- Na blockchain šaljemo već izračunat **totalPriceWei** (npr. konverzija RSD → ETH/Wei prema nekom kursu ili fiksna testna vrednost).

### 3. Provera zaliha dobavljača

- **Opcija A (preporuka za prvu verziju):**  
  Provera da dobavljač ima dovoljno materijala radi se u **backendu** (već postoji `inventory_items` i logika). Smart contract samo proverava da je zahtev **potvrđen od strane dobavljača** i da je dizajner **deponovao** dovoljno sredstava. Izvršenje = prenos novca sa ugovora na wallet dobavljača.
- **Opcija B (kasnije):**  
  Zalihe budu na blockchainu (npr. proširen `InventoryContract` ili novi contract), a ugovor na chainu proverava i umanjuje zalihe. Za prvi ugovor nije obavezno.

### 4. Plaćanje

- Dizajner (brand owner) plaća u **ETH** na testnetu (Sepolia).
- Dva koraka:
  1. **Dizajner deponuje iznos** u pametni ugovor (npr. `fundRequest(requestId)` payable).
  2. **Dobavljač prihvata** zahtev (`acceptRequest(requestId)`): ugovor proveri da je deponovano dovoljno i prebaci sredstva na adresu dobavljača.

### 5. Povezanost sa aplikacijom

- Zahtev za materijal i dalje se kreira u bazi (tabela `material_requests` ili slično), sa stavkama (npr. lan 10 kg, pamuk 5 kg).
- Backend računa `totalPriceWei` (iz količina × cene dobavljača + kurs).
- Frontend:
  - kod „Zatraži materijal” otvara se forma sa količinama (i eventualno izborom dobavljača),
  - po slanju zahteva: kreira se zapis u bazi, pozove se blockchain: `createRequest(...)` pa `fundRequest(requestId)` sa iznosom u ETH.
- Dobavljač u aplikaciji vidi listu zahteva; kod „Prihvati” poziva se `acceptRequest(requestId)` na ugovoru. Ugovor prebaci deponovani iznos na dobavljačev wallet.

---

## Predlog strukture pametnog ugovora

### Stanje

- `owner` – vlasnik ugovora (opciono, za admin).
- Za svaki zahtev:
  - `requestId` (bytes32)
  - `designer` (address)
  - `supplier` (address)
  - `totalPriceWei` (uint256)
  - `status`: pending | funded | accepted | rejected
  - `materials` – niz parova (materialName, quantityKg) – samo za log/reference; računanje cene je na backendu.

### Funkcije

1. **createRequest(requestId, supplierAddress, totalPriceWei, materials[])**
   - Poziva: samo dizajner (brand owner).
   - Postavlja zahtev u stanje `pending`, pamti `designer`, `supplier`, `totalPriceWei`, `materials`.

2. **fundRequest(requestId)**
   - Poziva: dizajner.
   - `payable` – šalje `msg.value == totalPriceWei` na ugovor.
   - Uslov: status je `pending`. Posle toga status → `funded`.

3. **acceptRequest(requestId)**
   - Poziva: samo dobavljač (adresa koja je u zahtevu).
   - Uslovi: status `funded`, ugovor ima na balance-u >= `totalPriceWei`.
   - Akcija: `supplier.transfer(totalPriceWei)`, status → `accepted`, event.

4. **rejectRequest(requestId)** (opciono)
   - Poziva: dobavljač.
   - Ako je status još uvek `pending` ili `funded`, dizajner može dobiti nazad sredstva (npr. `designer.transfer(amount)`), status → `rejected`.

### Eventi

- `RequestCreated(requestId, designer, supplier, totalPriceWei)`
- `RequestFunded(requestId, designer, amount)`
- `RequestAccepted(requestId, supplier, amount)`
- `RequestRejected(requestId, supplier)`

---

## Kako znati koliko tačno čega treba

- Za ovaj ugovor: **dizajner eksplicitno unosi količine u kg** pri „Zatraži materijal” (npr. 10 kg lana, 5 kg pamuka). To su „količine na veliko” za narudžbinu od dobavljača.
- Procenti iz modela (Lan 95%, Pamuk 5%) koriste se kasnije kod proizvođača za razvoj proizvoda po skici. Moguće je u frontendu prikazati procente pored polja za kg (npr. „Preporuka u skladu sa skicom: ~X kg lana, ~Y kg pamuka”) ali ugovor se veže za **stvarne kg** koje dizajner unese.

---

## Sledeći koraci

1. Implementirati pametni ugovor (create / fund / accept, eventi).
2. Backend: pri kreiranju zahteva za materijal računati `totalPriceWei` (iz količina i cena dobavljača), vratiti ga frontu.
3. Frontend (Razvoj modela):
   - forma „Zatraži materijal” za više materijala (npr. lan 10 kg, pamuk 5 kg),
   - po submit: kreirati zahtev u bazi, pozvati `createRequest` + `fundRequest` sa MetaMask-om (dizajner = brand owner wallet).
4. Frontend (Dobavljač):
   - lista zahteva sa statusom „na čekanju” / „funded”,
   - dugme „Prihvati”: poziv `acceptRequest(requestId)` (dobavljačev wallet).
5. Opciono kasnije: provera zaliha dobavljača na chainu i umanjenje zaliha u drugom contractu.

Ako se ovako saglasimo, sledeći korak je konkretna Solidity implementacija i ABI za frontend/backend.

**Implementacija:** Jedan zahtev = jedan bundle_id (UUID) = jedan requestId na ugovoru; bundle može imati 2+ materijala. Backend proverava zalihe pri kreiranju i umanjuje ih pri prihvatanju. U `profiles` dodato je polje `wallet_address`; u `.env`: `DESIGNER_SUPPLIER_CONTRACT=0x...`.
