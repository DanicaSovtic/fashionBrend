# Blockchain integracija – uputstvo

Aplikacija podržava plaćanje putem MetaMask-a na **Sepolia testnetu**, uz dual storage: transakcije se pamte i u bazi i na blockchainu.

## 1. Sepolia testnet

- **Chain ID:** 11155111  
- Aplikacija automatski prebacuje MetaMask na Sepolia pri plaćanju.  
- Besplatan test ETH: [sepoliafaucet.org](https://sepoliafaucet.org) ili [faucet.free](https://faucet.free).

## 2. Konfiguracija backend-a

U `backend/.env`:

```env
# Adresa deploy-ovanog OrderPayment.sol (obavezno)
ORDER_PAYMENT_CONTRACT=0x...

# Adresa vlasnika brenda – prima sva plaćanja (ista adresa koju si uneo u constructor pri deploy-u)
# Koristi se samo za referencu/prikaz; primaoca određuje contract
BRAND_OWNER_WALLET=0xTvojaAdresaVlasnikaBrenda
```

## 3. Migracija baze

Pokreni SQL iz `supabase/add_blockchain_fields.sql` da se dodaju polja za blockchain:

- `wallet_address`
- `tx_hash`
- `blockchain_network`
- `amount_wei`
- `contract_address`
- `block_number`

## 4. Smart contract – OrderPayment

U `contracts/OrderPayment.sol` – ugovor za plaćanja; **sva plaćanja idu direktno na adresu vlasnika brenda**.

Deploy na Sepolia (preko [Remix](https://remix.ethereum.org)):

1. Otvori `OrderPayment.sol` u Remix-u.
2. Kompajliraj (Compiler 0.8.20+).
3. Deploy na Sepolia (Injected Provider – MetaMask).
4. U polju za constructor unesi adresu vlasnika brenda:
   - **Tvoja adresa** – ako ti deploy-uješ, unesi svoju MetaMask adresu
   - **`0x0000000000000000000000000000000000000000`** – ako deploy-uješ svojim walletom, koristi se tvoja adresa automatski
5. Klikni Deploy, potvrdi u MetaMask-u.
6. Kopiraj adresu ugovora i u `.env` stavi: `ORDER_PAYMENT_CONTRACT=0x...`.

## 5. Tok plaćanja (MetaMask)

1. Korisnik bira MetaMask i povezuje wallet.
2. Aplikacija prebacuje na Sepolia.
3. Kreira se narudžbina u bazi (status: `pending_blockchain`).
4. Korisnik šalje ETH putem MetaMask-a (ili preko contracta).
5. Backend prima `tx_hash` i ažurira narudžbinu (status: `ready_for_shipping`).
6. Transakcija ostaje zabeležena u bazi i na blockchainu.
