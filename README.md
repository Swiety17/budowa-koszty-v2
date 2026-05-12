# Budowa Koszty

Mobilna aplikacja PWA do śledzenia kosztów budowy domu. Działa jak natywna aplikacja po dodaniu do ekranu głównego iPhone/Android.

## Funkcje

- **Koszty** — dodawanie z kwotą, kategorią, etapem, wykonawcą, datą i zdjęciem paragonu
- **OCR paragonów** — automatyczne odczytywanie danych ze zdjęcia przez Claude AI
- **Etapy budowy** — podział kosztów na etapy (stan surowy, dach, wykończenie…) z budżetem i progress barem
- **Paragony** — galeria zdjęć paragonów przypisanych do projektu
- **Filtry** — szukaj po nazwie, filtruj po kategorii, etapie, wykonawcy
- **Wykonawcy** — autocomplete przy dodawaniu kosztu na podstawie historii
- **Tryb ciemny** — przełącznik jasny/ciemny
- **Udostępnianie** — zaproś współpracownika/małżonka emailem
- **PWA** — działa offline, pull-to-refresh, ikona na ekranie głównym
- **Testy E2E** — 30 testów Playwright

## Stos technologiczny

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- [Supabase](https://supabase.com) — baza danych PostgreSQL + auth + storage
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Anthropic Claude](https://anthropic.com) — OCR paragonów
- [Nodemailer](https://nodemailer.com) — maile zaproszeniowe przez Gmail
- [Playwright](https://playwright.dev) — testy E2E

---

## Instalacja

### 1. Wymagania wstępne

- Node.js 20+
- Konto [Supabase](https://supabase.com) (bezpłatny tier wystarczy)
- Konto [Anthropic](https://console.anthropic.com) (opcjonalne, do OCR)
- Gmail z włączoną weryfikacją dwuetapową (do maili)

### 2. Sklonuj repozytorium

```bash
git clone https://github.com/TWOJ_USERNAME/budowa-koszty.git
cd budowa-koszty
npm install
```

### 3. Skonfiguruj Supabase

#### a) Utwórz projekt

Wejdź na [supabase.com](https://supabase.com), utwórz nowy projekt i zapamiętaj:
- **Project URL** — np. `https://abcdefgh.supabase.co`
- **anon key** — z zakładki Project Settings → API
- **service_role key** — z tej samej zakładki (nie udostępniaj publicznie!)

#### b) Uruchom migracje

W Supabase Dashboard → SQL Editor wklej i wykonaj poniższy skrypt:

```sql
-- Projekty budowlane
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  address text,
  budget numeric,
  notes text,
  created_at timestamptz default now()
);

-- Kategorie kosztów (wbudowane — user_id null, lub własne użytkownika)
create table if not exists cost_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text not null,
  color text not null default '#6b7280'
);

-- Etapy budowy
create table if not exists project_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade not null,
  name text not null,
  color text not null default '#6b7280',
  budget numeric,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

-- Koszty
create table if not exists costs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade not null,
  category_id uuid references cost_categories,
  stage_id uuid references project_stages,
  name text not null,
  amount numeric not null,
  date date not null,
  vendor text,
  notes text,
  receipt_url text,
  created_at timestamptz default now()
);

-- Wykonawcy (autocomplete)
create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  unique(user_id, name)
);

-- Członkowie projektu (zaproszeni emailem)
create table if not exists budowa_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade not null,
  invited_email text not null,
  created_at timestamptz default now(),
  unique(project_id, invited_email)
);

-- Domyślne kategorie
insert into cost_categories (name, color) values
  ('Materiały budowlane', '#f97316'),
  ('Robocizna',           '#3b82f6'),
  ('Instalacje',          '#22c55e'),
  ('Wykończenie',         '#a855f7'),
  ('Wyposażenie',         '#ec4899'),
  ('Transport',           '#eab308'),
  ('Inne',                '#6b7280')
on conflict do nothing;

-- RLS (włącz Row Level Security)
alter table projects        enable row level security;
alter table cost_categories enable row level security;
alter table project_stages  enable row level security;
alter table costs           enable row level security;
alter table vendors         enable row level security;
alter table budowa_members  enable row level security;
```

#### c) Storage (zdjęcia paragonów)

W Supabase Dashboard → Storage utwórz bucket o nazwie **`receipts`** i ustaw go jako **Public**.

### 4. Zmienne środowiskowe

```bash
cp .env.example .env.local
```

Uzupełnij `.env.local` zgodnie z komentarzami w pliku.

#### Gmail App Password

1. Włącz weryfikację dwuetapową na koncie Google
2. Wejdź na [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Utwórz hasło dla aplikacji „Mail"
4. Wpisz wygenerowane 16-znakowe hasło jako `GMAIL_APP_PASSWORD`

#### Supabase SMTP (maile weryfikacyjne przy rejestracji)

W Supabase Dashboard → Authentication → SMTP Settings:

| Pole | Wartość |
|---|---|
| Enable Custom SMTP | ✅ |
| Host | `smtp.gmail.com` |
| Port | `587` |
| Username | Twój adres Gmail |
| Password | Gmail App Password |
| Sender name | `Budowa Koszty` |
| Sender email | Twój adres Gmail |

### 5. Uruchom lokalnie

```bash
npm run dev
```

Aplikacja dostępna na [http://localhost:3000](http://localhost:3000).

---

## Deploy na Vercel

### Jednym kliknięciem

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/TWOJ_USERNAME/budowa-koszty)

### Ręcznie

```bash
npm i -g vercel
vercel login
vercel --prod
```

Dodaj zmienne środowiskowe w Vercel Dashboard → Project → Settings → Environment Variables (te same co w `.env.local`).

---

## Testy E2E

Testy wymagają działającej instancji aplikacji i konta testowego w Supabase.

```bash
# Ustaw URL testowanej aplikacji
export E2E_BASE_URL=http://localhost:3000

npx playwright test

# Z podglądem przeglądarki
npx playwright test --headed
```

Konto testowe (`E2E_EMAIL` / `E2E_PASSWORD` z `.env.local`) musi istnieć w Supabase Auth — utwórz je w Dashboard → Authentication → Users.

---

## Struktura projektu

```
app/
  (app)/          — chronione trasy (dashboard, projekty, koszty)
  (auth)/         — logowanie i rejestracja
  api/            — API routes (projekty, koszty, etapy, paragony, OCR…)
  manifest.ts     — PWA manifest
components/
  app/            — komponenty biznesowe (formularze, listy, etapy…)
  layout/         — AppShell, Sidebar, BottomNav
  ui/             — shadcn/ui komponenty
lib/
  supabase/       — klient Supabase (server/client/admin)
  email.ts        — wysyłka maili przez Gmail
  format.ts       — formatowanie kwot i dat
  authorizeProject.ts — middleware autoryzacji projektu
public/
  icons/          — ikony PWA (192px, 512px, apple-touch-icon)
tests/
  app.spec.ts     — 30 testów Playwright
```

---

## Licencja

MIT — możesz swobodnie używać, modyfikować i wdrażać na własne potrzeby.
