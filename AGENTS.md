# Repository Guidelines

## Project Structure & Module Organization
- `app/` houses Next.js routes; `app/(private)` is the authenticated workspace, while `app/login` and `app/onboarding` gate first-time access.
- `app/api/` serves auth, files, users, and settings handlers—keep server logic here and share helpers through `lib/`.
- `components/` and `hooks/` contain shadcn-inspired UI and reusable logic; extend them before adding new folders.
- `lib/` centralizes Prisma/AWS utilities; `prisma/` holds `schema.prisma`; `scripts/` provides password hashing and reset helpers.

## Build, Test, and Development Commands
- `npm install` installs dependencies; prefer npm because the repo ships with `package-lock.json`.
- `npm run dev` starts the Next.js dev server with hot reload at `http://localhost:3000`.
- `npm run build` regenerates Prisma types (`prisma:generate`) and compiles the production bundle.
- `npm start` serves the optimized build; use it to spot parity issues before deployment.
- `npm run lint` enforces `eslint.config.mjs`; fix all findings prior to commits.
- `npm run prisma:push` syncs the schema with MongoDB, while `npm run prisma:studio` opens the data inspector.

## Coding Style & Naming Conventions
- Use TypeScript with 2-space indentation, trailing commas, and no semi-colons as enforced by ESLint.
- Name React components and files in `PascalCase`, hooks in `useCamelCase`, and utilities in `camelCase`.
- Co-locate Tailwind classes on the element they style and prefer `clsx`/`tailwind-merge` over manual string concatenation.
- Preserve Portuguese UI copy and consolidate repeated labels in `lib/` when needed.

## Testing Guidelines
- Automated tests are not yet configured; when adding them, colocate `*.test.ts` or `*.spec.ts` files beside the code or under a dedicated `tests/` folder.
- Add a matching npm script (`test`, `test:e2e`) so future CI can run `npm run lint && npm test`, and validate Prisma changes with `npm run prisma:push` on a disposable database.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `refactor:`, `fix:`) as seen in the history and scope the subject to the impacted area.
- Keep PRs focused, link issues, and describe runtime, schema, or UI impacts (attach screenshots for visual tweaks).
- Call out env or data prerequisites—such as running `scripts/reset-admin-password.mjs`—and verify `npm run lint` (plus any new tests) before requesting review.

## Environment & Security
- Copy `.env.example` to `.env.local`, fill `AUTH_SECRET`, MongoDB, and AWS/CDN fields, and keep secrets out of version control.
- Prefer the utilities in `scripts/` for password management and apply the minimal S3 policy from the README, rotating credentials when the `settings` form changes.
- Garanta regras de CORS no bucket S3 permitindo `PUT`, `GET` e `HEAD` a partir do domínio do painel para que os uploads com presigned URL funcionem sem bloqueios.
