# NOIR - Modern Fashion Brand Landing Page

Modern landing stranica za modni brend, napravljena u React-u sa čistim i minimalističkim dizajnom.

## Tehnički zahtevi

- React 18+ (funkcionalne komponente)
- Vite kao build tool
- Čist CSS za stilizaciju
- Responsive dizajn (desktop, tablet, mobile)

## Struktura projekta

```
brend/
├── backend/
│   ├── routes/
│   ├── services/
│   ├── package.json
│   ├── server.js
│   └── .env.example
├── supabase/
│   └── schema.sql
├── src/
│   ├── components/
│   │   ├── Home.jsx      # Glavna komponenta sa navbar-om i hero sekcijom
│   │   └── Home.css      # Stilovi za Home komponentu
│   ├── App.jsx           # Root komponenta
│   ├── main.jsx          # Entry point
│   └── index.css         # Globalni stilovi
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Instalacija i pokretanje

1. Instaliraj frontend zavisnosti:
```bash
npm install
```

2. Instaliraj backend zavisnosti:
```bash
cd backend
npm install
```

3. Podesi Supabase env varijable:
```bash
cd backend
cp .env.example .env
```
Popuni `SUPABASE_URL` i `SUPABASE_ANON_KEY` iz Supabase projekta.

4. Kreiraj tabele u Supabase:
- Otvori SQL editor u Supabase i pokreni `supabase/schema.sql`

5. Pokreni backend:
```bash
cd backend
npm run dev
```

6. Pokreni frontend:
```bash
cd ..
npm run dev
```

7. Build za produkciju:
```bash
npm run build
```

## API endpoinit

- `GET /api/products` - vraća proizvode iz Supabase
- `POST /api/seed-products` - uvozi proizvode iz Fake Store API

## Funkcionalnosti

- **Sticky navbar** sa logo-om i navigacionim linkovima
- **Hero sekcija** sa velikim headline-om, sloganom i CTA dugmetom
- **Responsive dizajn** optimizovan za sve veličine ekrana
- **Smooth hover efekti** na linkovima i dugmetu
- **Moderni, minimalistički dizajn** sa luxury/fashion vibe-om

## Dizajn

- Neutralne boje: crna, bela, siva
- Moderni sans-serif font (Inter)
- Smooth animacije i tranzicije
- Fashion/luxury estetika

