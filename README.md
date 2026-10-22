# Radar

A for-you feed for GitHub. An endless, personalized scroll of open-source repositories — star and follow straight from the feed. Built with Next.js and deployable to Vercel.

## How it works

Three feeds, all drawn live from the GitHub API:

- **For You** ranks fresh repositories by a transparent score (see below), weighted toward the languages you already star and the people you follow.
- **Trending** surfaces repositories gaining stars over the last two weeks.
- **Following** shows recent work from the developers you follow.

A **like is a real GitHub star** and **follow is a real GitHub follow** — no separate database, your actions live on your GitHub account.

### The ranking

`src/lib/score.ts` scores each candidate:

```
score = 4·follows_author + 3·language_match + 2·freshness + 0.6·log10(stars)
```

- `follows_author` — 1 if you follow the owner.
- `language_match` — how strongly you star this language, normalized against your most-starred one.
- `freshness` — exponential decay by days since the last push.
- `stars` — popularity, dampened so it never dominates personal signals.

It's deliberately legible: adjust the four weights in one place. Covered by `src/lib/score.test.ts`.

## Auth and secrets

Login uses GitHub OAuth. The token exchange needs your OAuth **client secret**, which never reaches the browser — it is read only inside the server route `src/app/api/auth/callback/route.ts`. The access token is stored in an **httpOnly cookie**, and every GitHub call runs server-side in `src/app/api/*`, so the browser never sees the token. This is why the app needs a server (Vercel) and cannot run as a purely static GitHub Pages site.

## Setup

### 1. Create a GitHub OAuth app

<https://github.com/settings/developers> → New OAuth App.

- Homepage URL: your deployment URL (e.g. `https://radar.vercel.app`), or `http://localhost:3000` for local dev.
- Authorization callback URL: `<that URL>/api/auth/callback`.

Register a second app (or edit the callback) for localhost if you develop locally — GitHub allows one callback URL per app.

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### 3. Run locally

```
pnpm install
pnpm dev
```

### 4. Deploy to Vercel

Import the repo in Vercel, add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` as Environment Variables (not prefixed with `NEXT_PUBLIC_`), and deploy. Point the OAuth app's callback URL at `https://<your-project>.vercel.app/api/auth/callback`.

## Scripts

```
pnpm dev        # local dev server
pnpm build      # production build
pnpm typecheck  # tsc --noEmit
pnpm test       # vitest (scoring)
```

Uses pnpm (`packageManager` is pinned). On Vercel, set the install command to `pnpm install` — it's detected automatically from `pnpm-lock.yaml`.

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn-style components, Geist. The feed shows four streams — For You, Trending, Following, My Stars — with an endless scroll that remembers what you've seen, and star/follow buttons that reflect your real GitHub state.

## License

MIT
