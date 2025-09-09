#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.replace(/^--/, '').split('=');
      if (v !== undefined) args[k] = v;
      else if (i + 1 < argv.length && !argv[i+1].startsWith('-')) args[k] = argv[++i];
      else args[k] = true;
    } else {
      args._.push(a);
    }
  }
  return args;
}

function render(tpl, vars) {
  return tpl.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => vars[key] ?? '');
}

function writeFileSafe(filePath, content, dry) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) {
    throw new Error(`Refusing to overwrite existing file: ${filePath}`);
  }
  if (dry) {
    console.log(`[dry] Would write: ${filePath}`);
    return;
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✔ Wrote ${filePath}`);
}

function load(name) {
  const p = path.resolve(__dirname, '../templates', name);
  return fs.readFileSync(p, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv);
  const cmd = args._[0];
  if (!cmd || !['new','help'].includes(cmd)) {
    console.log(`Usage: api-gen new [--dir apps/api] [--name api] [--packageName @apps/api] [--port 4000] [--db] [--open] [--dry]`);
    process.exit(cmd ? 1 : 0);
  }
  if (cmd === 'help') {
    console.log(`Usage: api-gen new --dir apps/api --name api --packageName @apps/api --port 4000 --db`);
    process.exit(0);
  }

  const dir = args.dir || 'apps/api';
  const name = args.name || 'api';
  const packageName = args.packageName || '@apps/api';
  const port = String(args.port || 4000);
  const withDb = !!args.db;
  const dry = !!args.dry;
  const shouldOpen = !!args.open;

  const projectRoot = path.resolve(process.cwd(), dir);
  const vars = {
    name,
    packageName,
    port,
    year: new Date().getFullYear().toString(),
    withDb
  };

  // Common files
  const files = {
    'package.json': render(load('package.json.hbs'), vars),
    'tsconfig.json': render(load('tsconfig.json.hbs'), vars),
    'tsconfig.build.json': render(load('tsconfig.build.json.hbs'), vars),
    'src/index.ts': render(load('src/index.ts.hbs'), vars),
    'src/server.ts': render(load('src/server.ts.hbs'), vars),
    'src/routes/health.ts': render(load('src/routes/health.ts.hbs'), vars),
    'src/middleware/auth.ts': render(load('src/middleware/auth.ts.hbs'), vars),
    'src/middleware/validate.ts': render(load('src/middleware/validate.ts.hbs'), vars),
    'src/schemas/shared.ts': render(load('src/schemas/shared.ts.hbs'), vars),
    'src/env.ts': render(load('src/env.ts.hbs'), vars),
    'src/logger.ts': render(load('src/logger.ts.hbs'), vars),
    'src/docs/swagger.ts': render(load('src/docs/swagger.ts.hbs'), vars),
    'README.md': render(load('README.md.hbs'), vars),
    '.env.example': render(load('env.example.hbs'), vars),
    '.gitignore': render(load('gitignore.hbs'), vars),
    '.eslintrc.cjs': render(load('eslintrc.cjs.hbs'), vars),
    '.eslintignore': render(load('eslintignore.hbs'), vars),
    '.prettierrc.json': render(load('prettierrc.json.hbs'), vars),
    '.editorconfig': render(load('editorconfig.hbs'), vars),
    'Dockerfile': render(load('Dockerfile.hbs'), vars),
    'docker-compose.yml': render(load(withDb ? 'docker-compose.db.hbs' : 'docker-compose.hbs'), vars)
  };

  // DB optional files
  if (withDb) {
    files['drizzle.config.ts'] = render(load('drizzle.config.ts.hbs'), vars);
    files['src/db/client.ts'] = render(load('src/db/client.ts.hbs'), vars);
    files['src/db/schema.ts'] = render(load('src/db/schema.ts.hbs'), vars);
  }

  for (const [rel, content] of Object.entries(files)) {
    const out = path.join(projectRoot, rel);
    writeFileSafe(out, content, dry);
  }

  console.log('\\nNext steps:');
  console.log(`  1) Install dependencies:`);
  console.log(`     pnpm -w add -F ${packageName} express zod jsonwebtoken helmet cors express-rate-limit cookie-parser swagger-ui-express winston dotenv`);
  console.log(`     pnpm -w add -D -F ${packageName} typescript tsx vitest supertest @types/node @types/express @types/jsonwebtoken @types/cookie-parser @types/cors`);
  console.log(`     pnpm -w add -D -F ${packageName} eslint prettier eslint-config-prettier eslint-plugin-prettier eslint-plugin-import @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-airbnb-base eslint-config-airbnb-typescript`);
  if (withDb) {
    console.log(`     pnpm -w add -F ${packageName} pg drizzle-orm`);
    console.log(`     pnpm -w add -D -F ${packageName} drizzle-kit`);
  }
  console.log(`  2) Copy .env.example to .env and set JWT_SECRET${withDb ? ' and DATABASE_URL' : ''}`);
  console.log(`  3) Run: pnpm --filter ${packageName} dev`);

  if (shouldOpen && process.env.EDITOR) {
    const { spawn } = await import('node:child_process');
    spawn(process.env.EDITOR, [projectRoot], { stdio: 'inherit' });
  }
}

main();
