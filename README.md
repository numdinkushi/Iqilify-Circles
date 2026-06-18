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

1. [Sign up](https://garage.aboutcircles.com/signup)
2. Deploy to Vercel — set `NEXT_PUBLIC_APP_URL=https://iqilify-circles.vercel.app` in Vercel env vars (fixes OG/social previews)
3. [Register mini-app](https://garage.aboutcircles.com/register) with the live URL
4. Optional: PR to [`aboutcircles/CirclesMiniapps`](https://github.com/aboutcircles/CirclesMiniapps) — copy the entry from [`garage/miniapps-entry.json`](garage/miniapps-entry.json) into `static/miniapps.json`

**Voice in Circles:** Wallet and CRC flows work in the [playground](https://circles.gnosis.io/playground?url=https://iqilify-circles.vercel.app/). Voice interviews need a direct tab until the Circles host adds `microphone` to its iframe `allow` attribute.

## Circles primitives used

- `requestCreateAccount()` — onboarding + referrals
- `onWalletChange()` — wallet lifecycle
- `getProfileView()` — identity + CRC balance
- `constructAdvancedTransfer()` + annotated transfer data — debrief unlock payments
