/**
 * Clona o MySQL remoto (somente leitura via mysqldump) para o container Docker local.
 *
 * Pré-requisitos:
 *   - Docker rodando
 *   - Container `mobicyclo-db` ativo: `docker compose up -d db`
 *   - Credenciais do remoto em .env / .env.example (mesmas do `npm run db:test`)
 *
 * Host do servidor remoto (obrigatório um dos dois):
 *   DB_CLONE_SOURCE_HOST ou DB_TEST_HOST
 *
 * Uso:
 *   npx cross-env DB_TEST_HOST=187.77.254.38 npm run db:clone-from-remote
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

dotenv.config({ path: path.join(root, '.env.example') });
dotenv.config({ path: path.join(root, '.env'), override: true });

const sourceHost =
  process.env.DB_CLONE_SOURCE_HOST?.trim() ||
  process.env.DB_TEST_HOST?.trim() ||
  '';
const sourcePort = process.env.DB_CLONE_SOURCE_PORT || process.env.DB_PORT || '3306';
const sourceUser =
  process.env.DB_CLONE_SOURCE_USER?.trim() || process.env.DB_USER || 'mobicyclo';
const sourcePassword =
  process.env.DB_CLONE_SOURCE_PASSWORD ?? process.env.DB_PASSWORD ?? '';
const sourceDb =
  process.env.DB_CLONE_SOURCE_NAME?.trim() || process.env.DB_NAME || 'mobicyclo';

const localContainer =
  process.env.DB_LOCAL_MYSQL_CONTAINER?.trim() || 'mobicyclo-db';
const rootPassword = process.env.MYSQL_ROOT_PASSWORD || 'rootpass123';
const localDb =
  process.env.MYSQL_DATABASE?.trim() || process.env.DB_NAME || 'mobicyclo';

function runClone(): Promise<void> {
  return new Promise((resolve, reject) => {
    const dumpArgs = [
      'run',
      '--rm',
      '-e',
      `MYSQL_PWD=${sourcePassword}`,
      'mysql:8.0',
      'mysqldump',
      '-h',
      sourceHost,
      '-P',
      sourcePort,
      '-u',
      sourceUser,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--set-gtid-purged=OFF',
      '--column-statistics=0',
      sourceDb,
    ];

    const restoreArgs = [
      'exec',
      '-i',
      localContainer,
      'mysql',
      '-uroot',
      `-p${rootPassword}`,
      localDb,
    ];

    const dumpErr: string[] = [];
    const restoreErr: string[] = [];

    const dump = spawn('docker', dumpArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const restore = spawn('docker', restoreArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    dump.stderr.on('data', (c: Buffer) => dumpErr.push(c.toString()));
    restore.stderr.on('data', (c: Buffer) => restoreErr.push(c.toString()));

    dump.stdout.pipe(restore.stdin);

    restore.stdin.on('error', () => {
      try {
        dump.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    });

    let settled = false;

    dump.on('error', (err) => {
      if (settled) return;
      settled = true;
      try {
        restore.kill('SIGTERM');
      } catch {
        /* ignore */
      }
      reject(err);
    });

    dump.on('close', (code) => {
      if (code !== 0 && !settled) {
        settled = true;
        try {
          restore.kill('SIGTERM');
        } catch {
          /* ignore */
        }
        reject(
          new Error(
            `mysqldump saiu com código ${code}.\n${dumpErr.join('')}`
          )
        );
      }
    });

    restore.on('close', (code) => {
      if (settled) return;
      if (code !== 0) {
        settled = true;
        try {
          dump.kill('SIGTERM');
        } catch {
          /* ignore */
        }
        reject(
          new Error(
            `mysql (restore) saiu com código ${code}.\n${restoreErr.join('')}${dumpErr.join('')}`
          )
        );
      } else {
        settled = true;
        resolve();
      }
    });
  });
}

async function containerRunning(name: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const p = spawn(
      'docker',
      ['inspect', '-f', '{{.State.Running}}', name],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let out = '';
    p.stdout?.on('data', (c: Buffer) => {
      out += c.toString();
    });
    p.on('close', (code) => {
      if (code !== 0) resolve(false);
      else resolve(out.trim() === 'true');
    });
    p.on('error', reject);
  });
}

async function main() {
  if (!sourceHost) {
    console.error(
      '[db:clone] Defina o host remoto: DB_CLONE_SOURCE_HOST ou DB_TEST_HOST (ex.: npx cross-env DB_TEST_HOST=1.2.3.4 npm run db:clone-from-remote)'
    );
    process.exit(1);
  }

  console.log('[db:clone] Origem (somente leitura):', `${sourceUser}@${sourceHost}:${sourcePort}/${sourceDb}`);
  console.log('[db:clone] Destino:', `container ${localContainer} → database ${localDb}`);
  console.warn(
    '[db:clone] Isso substitui tabelas do banco LOCAL no Docker (não altera o servidor remoto além do dump de leitura).'
  );

  const running = await containerRunning(localContainer);
  if (!running) {
    console.error(
      `[db:clone] Container "${localContainer}" não está em execução. Suba o MySQL: docker compose up -d db`
    );
    process.exit(1);
  }

  await runClone();
  console.log('[db:clone] Concluído. Valide com: npm run db:test (e/ou DB_HOST=localhost se o app for fora do Compose).');
}

main().catch((err) => {
  console.error('[db:clone] Falha:', err instanceof Error ? err.message : err);
  process.exit(1);
});
