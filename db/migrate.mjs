import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

function run(command, args, input) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    input,
    stdio: input === undefined ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} fallo`);
  }

  return result.stdout.trim();
}

const containerId = run('docker', ['compose', 'ps', '-q', 'postgres']);
if (!containerId) throw new Error('PostgreSQL no esta iniciado. Ejecuta: docker compose up -d postgres');

const psql = (source) =>
  run(
    'docker',
    ['exec', '-i', containerId, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'luma_pass', '-d', 'luma_pass'],
    source,
  );

psql(`
  create table if not exists luma_schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  );
`);

const migrationsDirectory = join(process.cwd(), 'db', 'migrations');
const files = (await readdir(migrationsDirectory))
  .filter((filename) => filename.endsWith('.sql'))
  .sort();

for (const filename of files) {
  const safeFilename = filename.replaceAll("'", "''");
  const applied = run('docker', [
    'exec', containerId, 'psql', '-U', 'luma_pass', '-d', 'luma_pass', '-tAc',
    `select 1 from luma_schema_migrations where filename = '${safeFilename}';`,
  ]);

  if (applied === '1') continue;

  const source = await readFile(join(migrationsDirectory, filename), 'utf8');
  psql(`begin;\n${source}\ninsert into luma_schema_migrations (filename) values ('${safeFilename}');\ncommit;`);
  console.log(`Migracion aplicada: ${filename}`);
}

console.log('Base de datos actualizada.');
