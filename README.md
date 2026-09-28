# Léxico — public sample edition

A local-first Spanish vocabulary learning demo built with Expo, React Native and TypeScript. Explore a curated 90-record sample through Spanish, English and Chinese search, word families, morphology, conjugation and spaced review. The larger private development corpus is not distributed. This staging edition is not yet published.

Stack: Expo **56.0.8**, Expo Router **56.2.8**, React **19.2.3**, React Native **0.85.3**, TypeScript **6.0.3**; IndexedDB on web, SQLite on native, optional Supabase.

## Run locally

Use Node 22.18+ and npm:

```sh
npm ci
npm run web
```

No `.env`, Supabase account or API key is required. Platform text-to-speech is the default (the operating system may use a network speech service).

## Sample and features

- 90 independently drafted records: **41 A1, 30 A2, 19 B1**; CEFR labels are editorial, not certification.
- **29 nouns, 25 verbs, 16 adjectives, 8 adverbs, 12 other entries**. CEFR labels apply to selected senses/headwords; examples are illustrative and are not guaranteed to be fully level-controlled.
- Eight word families, four overlapping topics and six compact guide cards.
- Accent-insensitive Spanish lookup, English/Chinese lookup, prefix search, noun/adjective inflections and reverse conjugation.
- Sixteen conjugation tables for sample verbs; independent overrides for tener, ser, ir, hacer, poder and dormir.
- Collections, familiarity ratings, review scheduling and local missing-word reports.

## Architecture and storage

Expo Router screens live in `src/app`; reusable UI lives in `src/components`. Bundled sample vocabulary, topics and guides are in `src/data`. `src/lib` contains search, morphology, conjugation, review logic and platform-specific storage adapters. Web uses IndexedDB `lexico-public-sample90-v1`; native uses a separate sample SQLite file. Auth/voice preferences use the `lexico-public-sample90` namespace. This edition does not migrate private or pilot databases. Local data stays in this browser/device and may be lost when storage is cleared.

## Optional cloud and environment

Copy `.env.example` to `.env` only to configure your own Supabase project. `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` enable optional authentication/cloud operations. These public variables must never contain service-role or private keys. Provision and review your own schema, constraints, storage rules and RLS first; migrations are not supplied. `EXPO_PUBLIC_ADMIN_USER_ID` is only a public UI hint, never server authorization. Hosted audio requires explicit `EXPO_PUBLIC_ENABLE_AUDIO=true` and your own audio bucket/rights. Default local mode makes no Supabase requests, stores missing-word reports locally and replaces sign-in controls with a local-mode notice. The local admin screen displays only this device's reports.

## AI and provenance

No LLM runs during normal app usage. Claude API preparation scripts in the development workflow demonstrate content-preparation tooling; they did not generate the approved 90-record public sample and are excluded from this distribution. The sample was independently assistant-drafted for this edition, with automated checks, reference checking and user-approved editorial corrections; independent human linguistic certification is not claimed. The original ten approved records are hash-checked unchanged. The larger private corpus is withheld because its provenance/licensing review remains incomplete. No production dataset or prerecorded audio is included. See [data provenance](docs/DATA_PROVENANCE.md), [manifest](docs/SAMPLE_PROVENANCE.json) and [content review](docs/CONTENT_REVIEW.md).

## Validation

```sh
npx tsc --noEmit
npm run test:conjugation
npm run test:review
npm run test:pilot
npm run test:sample
node scripts/local-mode-sanity.cjs
npx expo export -p web
node scripts/isolation-check.cjs
```

Local web validation passed, including search and collection/review/report persistence. Live Supabase and native-device behavior remain unverified.

`scripts/browser-smoke.cjs` requires separately installed Playwright and Chrome; set `PLAYWRIGHT_MODULE` if installed outside this project and `PILOT_ORIGIN` to the running server. It exercises search, collection/review persistence, reports and supporting routes.

## Web deployment

`npx expo export -p web` creates `dist/`. A static host such as Vercel can serve this output with route fallback appropriate to the configured Expo output. A generic `vercel.json` is included, but its deployment behavior is not yet verified. No linked Vercel project, deployment or production backend is included.

## Known limitations and roadmap

iOS/Android framework support exists, but production mobile parity/release is not verified. Local scheduling uses the existing SM-2-inspired algorithm; configured web cloud scheduling uses fixed familiarity intervals. Browser check-ins are incomplete; failed cards are immediately due but not requeued in-session. Cloud integration is not full bidirectional sync. The morphology engine is a heuristic and conjugation fixtures cover selected sample forms, not linguistic certification. Roadmap: independent human linguistic review, native parity checks, explicit cloud schema/RLS documentation and broader linguistic edge-case coverage. No measured learning outcomes, runtime AI tutoring or production-scale claims are made.

## Screenshots

Screenshots pending: multilingual search, word detail/conjugation, collection/review, sample guide.

## Privacy and license

Default demo data is device-local. Optional authentication/cloud features send data to the Supabase project you configure; review that project's privacy and retention rules. Platform TTS follows platform settings. Code remains [MIT](LICENSE), preserving the existing Expo notice. Original expressive sample content and curated sample organization are [CC BY 4.0](LICENSE-CONTENT) to the extent applicable rights are held; ordinary words and language facts are not claimed as proprietary. See [data provenance](docs/DATA_PROVENANCE.md).
