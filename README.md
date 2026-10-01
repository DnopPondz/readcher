# StudyReader

Web app for reading and studying uploaded documents (PDF, Word, TXT, Excel). No AI services; all features use standard algorithms.

The full specification, rules, and roadmap are in [CLAUDE.md](CLAUDE.md).

## Quick start

```bash
cp .env.example .env          # then set AUTH_SECRET (npx auth secret) and MEILI_MASTER_KEY
docker compose up -d          # postgres, redis, meilisearch, clamav
npm install
npx prisma migrate dev
npm run dev
```

## Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e              # E2E_WITH_SERVICES=1 to include DB-backed tests
```
