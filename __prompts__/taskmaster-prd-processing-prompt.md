# 🛠️ AI Prompt: Process a PRD into TaskMaster-Compatible Artifacts

I’m about to give you a full Product Requirements Document (PRD). Your job is to help me convert this into a TaskMaster-compatible set of artifacts for both frontend and backend.

Follow these steps carefully and **stop to check with me before generating any files**:

---

## ✅ Step 1: Analyze the PRD and Classify Work

- Read the PRD and identify which parts are **frontend**, **backend**, or **shared**.
- Split the work into two separate markdown files:
  - `*-frontend-prd.md`
  - `*-backend-prd.md`
- Add appropriate **TaskMaster tags** for each task:
  - `@frontend`, `@backend`, `#component`, `#accessibility`, `#database`, `#api`, etc.
- Add or update the following sections if not present:
  - **Edge Cases**
  - **Test Cases**
  - **Stretch Goals** (if implied)

---

## ✅ Step 2: Propose Supporting Technologies

Before doing anything else, pause and check with me.

🔍 Based on the PRD, suggest:

- Required **NPM packages** for both frontend and backend
  - Examples: `zod`, `helmet`, `cors`, `winston`, `RTK Query`, `react-hook-form`, etc.
- Any **security** or **accessibility packages**
- Frontend tools like `React Hook Form`, `ShadCN`, `Framer Motion`, `Tailwind`
- Backend tools like `multer`, `express-rate-limit`, `supertest`, `vitest`, etc.

Wait for my approval and any additions before continuing.

---

## ✅ Step 3: Define Data Structures with Zod

- For each model or form in the PRD, create a **Zod schema** in TypeScript.
- Clearly differentiate between backend (`*.schema.ts`) and frontend form schemas.
- Infer types using `z.infer<typeof Schema>`.

---

## ✅ Step 4: Generate Task Config Files

For each PRD:

- Generate a TaskMaster-compatible `.task-config.json` file.
- Include:
  - `task_categories`, `estimated_effort`, `routes`, `zod_schemas`
  - `testing` (Vitest + React Testing Library + `vitest-axe`)
  - Dev/Prod NPM dependencies
  - App structure
  - Monorepo conventions (e.g., all `shadcn-ui` components imported from `packages/ui`)
  - UX behavior rules (e.g., debounce with `lodash.debounce`)
  - Infra details if mentioned (e.g., Docker, S3, Postgres, Serverless)

---

## ✅ Step 5: Output Deliverables

After confirmation:

- ✅ Provide **two TaskMaster-ready `.md` files** (frontend + backend)
- ✅ Provide **two `.task-config.json` files** (frontend + backend)
- ✅ Include download links for each
- ✅ Offer to generate:
  - `docker-compose.yml` (if infra is mentioned)
  - Zod schemas as `.ts` files
  - Express route/controller scaffolds
  - RTK Query slices or React hooks

---

## 🧠 Style & Context

Use this project’s standards as your baseline:

- React frontend in a Turborepo monorepo
- ShadCN components imported from `packages/ui`
- Express backend with file uploads, Elasticsearch, Postgres
- Testing: Vitest, React Testing Library, `vitest-axe`
- Rate limiting and secure headers
- Frontend input debounced via `lodash.debounce`

---

Let me know when you're ready and I’ll paste in a new PRD.
