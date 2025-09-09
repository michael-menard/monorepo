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

function slugify(s) {
  return String(s).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function render(tpl, vars) {
  return tpl.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
    return vars[key] ?? '';
  });
}

function loadTemplate(name) {
  const p = path.resolve(__dirname, '../templates', name);
  return fs.readFileSync(p, 'utf8');
}

function writeFileSafe(filePath, content, dry) {
  if (dry) {
    console.log(`[dry] Would write: ${filePath}`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) {
    throw new Error(`Refusing to overwrite existing file: ${filePath}`);
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✔ Wrote ${filePath}`);
}

function openInEditor(files) {
  const editor = process.env.EDITOR;
  if (!editor) return;
  const { spawn } = require('node:child_process');
  spawn(editor, files, { stdio: 'inherit' });
}

function main() {
  const args = parseArgs(process.argv);
  const cmd = args._[0];
  if (!cmd || !['new', 'help'].includes(cmd)) {
    console.log(`Usage: prd-gen new --pkg <path> --name <feature> [--area ui] [--type feature] [--risk medium] [--owner @me] [--dry] [--open]`);
    process.exit(cmd ? 1 : 0);
  }
  if (cmd === 'help') {
    console.log(`See README.md for details.`);
    process.exit(0);
  }

  const pkg = args.pkg;
  const name = args.name;
  if (!pkg || !name) {
    console.error('Error: --pkg and --name are required.');
    process.exit(1);
  }
  const area = args.area || 'web';
  const type = args.type || 'feature';
  const risk = args.risk || 'medium';
  const owner = args.owner || '@owner';
  const dry = !!args.dry;
  const shouldOpen = !!args.open;

  const slug = slugify(name);
  const today = new Date();
  const date = today.toISOString().slice(0,10);
  const id = `${date}-${slug}`;
  const title = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const prdOut = path.resolve(process.cwd(), pkg, 'docs', 'prds', `${id}.md`);
  const cfgOut = path.resolve(process.cwd(), pkg, 'docs', 'prds', `${slug}.task-config.md`);

  const prdTpl = loadTemplate('prd.md.hbs');
  const cfgTpl = loadTemplate('task-config.md.hbs');

  const vars = { id, date, slug, title, owner, area, type, risk, package: pkg };
  const prd = render(prdTpl, vars);
  const cfg = render(cfgTpl, vars);

  writeFileSafe(prdOut, prd, dry);
  writeFileSafe(cfgOut, cfg, dry);

  if (shouldOpen && process.env.EDITOR) {
    openInEditor([prdOut, cfgOut]);
  }

  console.log('\nNext steps:');
  console.log(`  - Edit ${prdOut} to fill Goals/Criteria.`);
  console.log(`  - Run: task-master plan ${prdOut} --write tasks.json --link --labels`);
}

main();
