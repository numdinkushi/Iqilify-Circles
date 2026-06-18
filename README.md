# IQlify

AI interview prep mini-app for [circles/garage](https://garage.aboutcircles.com/). Ported from the [IQlify](https://iqlify.vercel.app) concept — **native CRC on Circles**, not Celo.

## What it does

- **CompetentIQ** — technical interview practice
- **ReflectIQ** — behavioral interview practice
- **BuilderIQ** — Circles/garage builder interview prep
- **CRC wallet** — view balance via Circles profile RPC
- **Leaderboard** — unlock full debrief with 2 CRC to post your score
- **Referrals** — invite friends to practice inside Circles

## Stack

- Next.js 16 + shadcn/ui (preset `b0`)
- `@aboutcircles/miniapp-sdk` — wallet, account creation, transactions
- `@aboutcircles/sdk` — profiles, balances
- `@aboutcircles/sdk-transfers` — pathfinding CRC payments

## Develop

```bash
cd iqlify
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Test inside the Circles host: [playground](https://circles.gnosis.io/playground?url=YOUR_DEPLOY_URL)

## Environment

```bash
# Org/recipient address that receives CRC debrief payments
NEXT_PUBLIC_IQLIFY_ORG_ADDRESS=0xYourCirclesOrgAddress
```

## Garage submission

Live app: [iqilify-circles.vercel.app](https://iqilify-circles.vercel.app/)

### 1. Vercel production env

In Vercel → **Settings → Environment Variables**, set at minimum:

- `NEXT_PUBLIC_APP_URL=https://iqilify-circles.vercel.app`
- All vars from `.env.local` (Convex, Vapi, Cloudinary, Circles treasury keys, etc.)

Redeploy after saving. Push `public/logo.svg` so the marketplace logo resolves.

### 2. Register on circles/garage

1. [Sign up](https://garage.aboutcircles.com/signup) (if needed)
2. [Register mini-app](https://garage.aboutcircles.com/register) — sign in with GitHub
3. Paste copy from [`garage/submission-copy.txt`](garage/submission-copy.txt)

Playground test URL for reviewers:

```txt
https://circles.gnosis.io/playground?url=https%3A%2F%2Fiqilify-circles.vercel.app%2F
```

### 3. PR to Circles miniapps marketplace

A branch is prepared locally at `../CirclesMiniapps-iqilify` (sibling to this repo) with:

- `static/miniapps.json` — IQlify garage entry
- `static/app-logos/iqilify.svg` — square logo

From that folder:

```bash
cd ../CirclesMiniapps-iqilify
gh auth login   # if needed
gh repo fork aboutcircles/CirclesMiniapps --clone=false --remote=false
git remote add fork git@github.com:YOUR_GITHUB/CirclesMiniapps.git
git push -u fork feat/add-iqilify-garage-app
gh pr create --repo aboutcircles/CirclesMiniapps \
  --title "feat: add IQlify garage app" \
  --body "$(cat <<'EOF'
## Summary
- Adds IQlify (AI interview prep on Circles) to the garage miniapps marketplace
- Live at https://iqilify-circles.vercel.app/
- Uses miniapp-sdk for wallet, referrals, and CRC debrief payments

## Test plan
- [ ] Open `/miniapps/iqilify` after deploy
- [ ] Wallet connect + account creation flow
- [ ] CRC debrief payment (2 CRC unlock)
- [ ] Voice: open app in direct tab (iframe mic blocked until host adds `microphone` allow)

EOF
)"
```

Or open the PR manually on [aboutcircles/CirclesMiniapps](https://github.com/aboutcircles/CirclesMiniapps).

### Voice in Circles iframe

Wallet and CRC flows work in the [playground](https://circles.gnosis.io/playground?url=https://iqilify-circles.vercel.app/). Voice interviews need a direct browser tab until the Circles host adds `microphone` to its iframe `allow` attribute — the app shows an **Open for voice interview** button in embed mode.

## Circles primitives used

- `requestCreateAccount()` — onboarding + referrals
- `onWalletChange()` — wallet lifecycle
- `getProfileView()` — identity + CRC balance
- `constructAdvancedTransfer()` + annotated transfer data — debrief unlock payments
