# Treći pametni ugovor: Dizajner – Proizvođač (završetak šivenja)

## Cilj

Kada proizvođač završi šivenje i pošalje sliku odrađenog kroja dizajneru, dizajner može:
- **Pusti na testiranje** → ugovor se izvršava uspešno, novac se prenosi sa dizajnera na proizvođača.
- **Vrati na doradu** → ugovor nije uspešan, novac se ne prenosi.

Cena usluge = **broj komada × cena po komadu**; cenu po komadu zadaje proizvođač pre slanja (pri „Završi šivenje“). U ugovoru se proverava da dizajner ima dovoljno sredstava kada potvrdi („Pusti na testiranje“).

---

## Učesnici

| Uloga | Akcija u ugovoru |
|------|-------------------|
| **Proizvođač** | Kreira zapis o završenom šivenju (completion): dizajner, broj komada, cena po komadu (u wei). Slika se čuva u backendu, ne na lancu. |
| **Dizajner** | Vidi sliku u aplikaciji; bira „Pusti na testiranje“ (plati) ili „Vrati na doradu“ (ne plati). |

---

## Tok

1. **Proizvođač: Završi šivenje**  
   U aplikaciji unosi: URL slike odrađenog kroja + **cenu po komadu** (npr. u RSD, konvertovano u wei u backendu).  
   Backend kreira/ažurira nalog (proof_document_url, price_per_piece), zatim proizvođač potpisuje transakciju:  
   `createSewingCompletion(completionId, designerAddress, quantityPieces, pricePerPieceWei)`  
   - `completionId` = `keccak256(sewing_order_id)` da bi jedinstveno identifikovao nalog.  
   - Ugovor računa: `totalAmountWei = quantityPieces * pricePerPieceWei` i čuva status `PendingDesignerReview`.

2. **Dizajner: Pusti na testiranje**  
   Dizajner u aplikaciji vidi sliku i klikne „Pusti na testiranje“.  
   Frontend poziva `designerApproveForTesting(completionId)` sa **msg.value = totalAmountWei** (vrednost iz ugovora).  
   - Ugovor proverava: `msg.sender == designer`, status je `PendingDesignerReview`, `msg.value == totalAmountWei`.  
   - Ako sve prolazi: prenosi `msg.value` na adresu proizvođača, postavlja status na `ApprovedForTesting`.  
   - Ako dizajner nema dovoljno sredstava, transakcija ne uspe (MetaMask / wallet ne dozvoli slanje).

3. **Dizajner: Vrati na doradu**  
   Dizajner klikne „Vrati na doradu“ (opciono unese razlog).  
   Frontend poziva `designerReturnForRework(completionId, reason)`.  
   - Ugovor proverava: `msg.sender == designer`, status je `PendingDesignerReview`.  
   - Postavlja status na `ReturnedForRework`. Novac se ne prenosi.

---

## Šta ugovor čuva (on-chain)

- `completionId` (bytes32) → struktura: `designer`, `manufacturer`, `quantityPieces`, `pricePerPieceWei`, `totalAmountWei`, `status`.
- Statusi: `None`, `PendingDesignerReview`, `ApprovedForTesting`, `ReturnedForRework`.
- Slika (URL) i razlog dorade čuvaju se u bazi (sewing_orders, request_messages), ne u ugovoru.

---

## Provere u ugovoru

- Pri kreiranju: `designer != address(0)`, `quantityPieces > 0`, `pricePerPieceWei > 0`, zapis za `completionId` još ne postoji.
- Pri „Pusti na testiranje“: pozivalac je dizajner, status je PendingDesignerReview, `msg.value == totalAmountWei`.
- Pri „Vrati na doradu“: pozivalac je dizajner, status je PendingDesignerReview.

---

## Integracija u aplikaciju (nakon ugovora)

- **Baza:** U `sewing_orders` dodati kolonu `price_per_piece_wei` (ili `price_per_piece` + valuta), opciono `contract_completion_id_hex` za referencu na ugovor.
- **Proizvođač – Završi šivenje:** Forma: proof_document_url + cena po komadu. Po potvrdi: PATCH complete sa ovim poljima, zatim poziv blockchain-a `createSewingCompletion(...)`.
- **Dizajner – Pristigli proizvodi:** Prikaz slike i dugmadi ostaju; „Pusti na testiranje“ poziva `designerApproveForTesting` sa iznosom iz ugovora (i ažurira development_stage / backend). „Vrati na doradu“ poziva `designerReturnForRework` i postojeći backend endpoint za return-for-rework.
- **Plaćanje:** Dizajner pri „Pusti na testiranje“ šalje ETH (ili native token) u vrednosti `totalAmountWei` u istoj transakciji; ugovor prosleđuje taj iznos proizvođaču.

---

## Naziv ugovora

`DesignerManufacturerContract` – usklađeno sa `DesignerSupplierContract` i `SupplierManufacturerContract`.
