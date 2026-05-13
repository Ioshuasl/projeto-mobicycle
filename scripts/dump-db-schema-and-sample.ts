/**
 * Exporta schema completo (DDL) e amostra de dados por tabela com associações (FK).
 * Mesma resolução de host/credenciais que `npm run db:test` (DB_TEST_HOST, .env.example, .env).
 *
 * Uso:
 *   npx cross-env DB_TEST_HOST=187.77.254.38 npm run db:dump-sample
 *
 * Opcional:
 *   DB_SAMPLE_LIMIT=20        — máximo de linhas por tabela na amostra principal
 *   DB_SAMPLE_OUT=dump        — pasta base (cria subpasta com timestamp)
 *   DB_SAMPLE_MAX_CLOSURE=200 — teto de linhas extras só para “fechar” FKs órfãs
 */
import dotenv from 'dotenv';
import fs from 'fs';
import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

dotenv.config({ path: path.join(root, '.env.example') });
dotenv.config({ path: path.join(root, '.env'), override: true });

const hostFromEnv = process.env.DB_HOST || 'localhost';
let host = process.env.DB_TEST_HOST?.trim() || hostFromEnv;
const port = parseInt(process.env.DB_PORT || '3306', 10);
const user = process.env.DB_USER || 'mobicyclo';
const password = process.env.DB_PASSWORD ?? '';
const database = process.env.DB_NAME || 'mobicyclo';

if (process.env.DB_TEST_HOST?.trim()) {
  console.log(`[db:dump-sample] Usando DB_TEST_HOST=${host} (ignora DB_HOST do .env para este comando).`);
}
if (!process.env.DB_TEST_HOST?.trim() && host === 'db') {
  host = 'localhost';
}

const SAMPLE_LIMIT = Math.max(1, parseInt(process.env.DB_SAMPLE_LIMIT || '15', 10));
const OUT_BASE = process.env.DB_SAMPLE_OUT?.trim() || 'dump';
const MAX_CLOSURE = Math.max(0, parseInt(process.env.DB_SAMPLE_MAX_CLOSURE || '200', 10));

type FkConstraint = {
  childTable: string;
  parentTable: string;
  constraintName: string;
  childCols: string[];
  parentCols: string[];
};

function escIdent(name: string): string {
  return '`' + String(name).replace(/`/g, '``') + '`';
}

function rowKey(table: string, pkCols: string[], row: Record<string, unknown>): string {
  if (pkCols.length === 0) {
    return `${table}:${JSON.stringify(row)}`;
  }
  return pkCols.map((c) => JSON.stringify(row[c])).join('|');
}

async function getBaseTables(conn: Connection): Promise<string[]> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT TABLE_NAME AS n
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
    [database]
  );
  return rows.map((r) => String(r.n));
}

async function getPrimaryKeyColumns(conn: Connection, table: string): Promise<string[]> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME AS c
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = 'PRIMARY'
     ORDER BY SEQ_IN_INDEX`,
    [database, table]
  );
  return rows.map((r) => String(r.c));
}

async function getForeignKeys(conn: Connection): Promise<FkConstraint[]> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT
       kcu.TABLE_NAME AS child_table,
       kcu.CONSTRAINT_NAME AS constraint_name,
       kcu.COLUMN_NAME AS child_col,
       kcu.ORDINAL_POSITION AS ord,
       kcu.REFERENCED_TABLE_NAME AS parent_table,
       kcu.REFERENCED_COLUMN_NAME AS parent_col
     FROM information_schema.KEY_COLUMN_USAGE kcu
     WHERE kcu.TABLE_SCHEMA = ?
       AND kcu.REFERENCED_TABLE_SCHEMA = ?
       AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
     ORDER BY kcu.TABLE_NAME, kcu.CONSTRAINT_NAME, kcu.ORDINAL_POSITION`,
    [database, database]
  );

  const byKey = new Map<string, FkConstraint>();
  for (const r of rows) {
    const child = String(r.child_table);
    const parent = String(r.parent_table);
    const cn = String(r.constraint_name);
    const key = `${child}\0${cn}`;
    let fk = byKey.get(key);
    if (!fk) {
      fk = { childTable: child, parentTable: parent, constraintName: cn, childCols: [], parentCols: [] };
      byKey.set(key, fk);
    }
    fk.childCols.push(String(r.child_col));
    fk.parentCols.push(String(r.parent_col));
  }
  return [...byKey.values()];
}

/** Ordem: tabelas referenciadas antes das que referenciam (para amostrar pais antes dos filhos). */
function topologicalTableOrder(tables: string[], fks: FkConstraint[]): string[] {
  const tableSet = new Set(tables);
  const parentRefs = new Map<string, Set<string>>();
  const childrenOfParent = new Map<string, Set<string>>();

  for (const fk of fks) {
    if (!tableSet.has(fk.childTable) || !tableSet.has(fk.parentTable)) continue;
    if (!parentRefs.has(fk.childTable)) parentRefs.set(fk.childTable, new Set());
    parentRefs.get(fk.childTable)!.add(fk.parentTable);
    if (!childrenOfParent.has(fk.parentTable)) childrenOfParent.set(fk.parentTable, new Set());
    childrenOfParent.get(fk.parentTable)!.add(fk.childTable);
  }

  const indegree = new Map<string, number>();
  for (const t of tables) indegree.set(t, parentRefs.get(t)?.size ?? 0);

  const queue: string[] = [];
  for (const t of tables) {
    if ((indegree.get(t) ?? 0) === 0) queue.push(t);
  }

  const order: string[] = [];
  while (queue.length) {
    const p = queue.shift()!;
    order.push(p);
    for (const c of childrenOfParent.get(p) ?? []) {
      const next = (indegree.get(c) ?? 0) - 1;
      indegree.set(c, next);
      if (next === 0) queue.push(c);
    }
  }

  if (order.length !== tables.length) {
    const rest = tables.filter((t) => !order.includes(t));
    order.push(...rest);
  }
  return order;
}

function buildInList(values: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const v of values) {
    const k = JSON.stringify(v);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function whereColIn(col: string, vals: unknown[]): { sql: string; params: unknown[] } {
  if (vals.length === 0) return { sql: '1=0', params: [] };
  const ph = vals.map(() => '?').join(',');
  return { sql: `${escIdent(col)} IN (${ph})`, params: [...vals] };
}

async function main() {
  console.log(
    `[db:dump-sample] ${user}@${host}:${port}/${database} limit=${SAMPLE_LIMIT} out=${OUT_BASE}`
  );

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    connectTimeout: 15_000,
  });

  try {
    const tables = await getBaseTables(conn);
    const fks = await getForeignKeys(conn);
    const pkByTable = new Map<string, string[]>();
    for (const t of tables) {
      pkByTable.set(t, await getPrimaryKeyColumns(conn, t));
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outDir = path.join(root, OUT_BASE, `db-snapshot-${database}-${ts}`);
    fs.mkdirSync(outDir, { recursive: true });

    // --- Schema (SHOW CREATE TABLE) ---
    const schemaParts: string[] = [
      `-- Schema dump for ${database}`,
      `-- Generated ${new Date().toISOString()}`,
      `SET NAMES utf8mb4;`,
      `SET FOREIGN_KEY_CHECKS=0;`,
      '',
    ];

    for (const t of tables) {
      const [rows] = await conn.query<RowDataPacket[]>(`SHOW CREATE TABLE ${escIdent(t)}`);
      const row = rows[0] as Record<string, string>;
      const ddl = row['Create Table'] ?? row['Create View'];
      schemaParts.push(`-- ----------------------------`, `-- ${t}`, `-- ----------------------------`, ddl + ';', '');
    }
    schemaParts.push(`SET FOREIGN_KEY_CHECKS=1;`, '');

    const schemaPath = path.join(outDir, 'schema.sql');
    fs.writeFileSync(schemaPath, schemaParts.join('\n'), 'utf8');
    console.log(`[db:dump-sample] Schema: ${schemaPath} (${tables.length} tabelas)`);

    // --- Amostra com associações ---
    const order = topologicalTableOrder(tables, fks);
    const samples = new Map<string, RowDataPacket[]>();
    const seenKeys = new Map<string, Set<string>>();

    for (const t of tables) {
      seenKeys.set(t, new Set());
    }

    const fksByChild = new Map<string, FkConstraint[]>();
    for (const fk of fks) {
      if (!fksByChild.has(fk.childTable)) fksByChild.set(fk.childTable, []);
      fksByChild.get(fk.childTable)!.push(fk);
    }

    for (const t of order) {
      const pkCols = pkByTable.get(t) ?? [];
      const childFks = fksByChild.get(t) ?? [];
      const orParts: string[] = [];
      const orParams: unknown[] = [];

      for (const fk of childFks) {
        const parentRows = samples.get(fk.parentTable);
        if (!parentRows?.length) continue;
        const valsPerParentCol: unknown[][] = fk.parentCols.map(() => []);
        for (const pr of parentRows) {
          for (let i = 0; i < fk.parentCols.length; i++) {
            valsPerParentCol[i].push(pr[fk.parentCols[i]]);
          }
        }
        if (fk.parentCols.length === 1) {
          const vals = buildInList(valsPerParentCol[0]);
          const { sql, params } = whereColIn(fk.childCols[0], vals);
          if (sql !== '1=0') {
            orParts.push(`(${sql})`);
            orParams.push(...params);
          }
        } else {
          const n = valsPerParentCol[0].length;
          const tuples: unknown[][] = [];
          for (let j = 0; j < n; j++) {
            const tuple = fk.parentCols.map((_, i) => valsPerParentCol[i][j]);
            tuples.push(tuple);
          }
          const uniq = new Map<string, unknown[]>();
          for (const tuple of tuples) {
            uniq.set(JSON.stringify(tuple), tuple);
          }
          const list = [...uniq.values()];
          if (list.length === 0) continue;
          const rowPh = fk.childCols.map(() => '?').join(',');
          const tuplePh = `(${rowPh})`;
          const inList = list.map(() => tuplePh).join(',');
          const flat = list.flat();
          orParts.push(`(${fk.childCols.map((c) => escIdent(c)).join(',')}) IN (${inList})`);
          orParams.push(...flat);
        }
      }

      let rows: RowDataPacket[] = [];
      const exclude = seenKeys.get(t)!;

      if (orParts.length) {
        const whereAssoc = orParts.join(' OR ');
        const orderSql =
          pkCols.length > 0 ? ` ORDER BY ${pkCols.map((c) => escIdent(c)).join(', ')}` : '';
        const [r1] = await conn.query<RowDataPacket[]>(
          `SELECT * FROM ${escIdent(t)} WHERE (${whereAssoc})${orderSql} LIMIT ${SAMPLE_LIMIT}`,
          orParams
        );
        rows = [...r1];
        for (const row of rows) {
          exclude.add(rowKey(t, pkCols, row as Record<string, unknown>));
        }
      }

      if (rows.length < SAMPLE_LIMIT) {
        const pk = pkCols;
        let notInSql = '';
        const notInParams: unknown[] = [];
        if (pk.length === 1 && exclude.size > 0) {
          const ids = [...exclude].map((k) => JSON.parse(k));
          const { sql, params } = whereColIn(pk[0], ids);
          notInSql = ` AND NOT (${sql})`;
          notInParams.push(...params);
        }
        const orderSql =
          pk.length > 0 ? ` ORDER BY ${pk.map((c) => escIdent(c)).join(', ')}` : '';
        const need = SAMPLE_LIMIT - rows.length;
        const [r2] = await conn.query<RowDataPacket[]>(
          `SELECT * FROM ${escIdent(t)} WHERE 1=1${notInSql}${orderSql} LIMIT ${need}`,
          notInParams
        );
        for (const row of r2) {
          const k = rowKey(t, pk, row as Record<string, unknown>);
          if (exclude.has(k)) continue;
          exclude.add(k);
          rows.push(row);
          if (rows.length >= SAMPLE_LIMIT) break;
        }
      } else {
        rows = rows.slice(0, SAMPLE_LIMIT);
      }

      samples.set(t, rows);
    }

    let closureUsed = 0;
    const addParentClosure = async () => {
      for (const fk of fks) {
        if (closureUsed >= MAX_CLOSURE) break;
        const childRows = samples.get(fk.childTable) ?? [];
        const parentList = samples.get(fk.parentTable) ?? [];
        const pkP = pkByTable.get(fk.parentTable) ?? [];
        const parentSeen = seenKeys.get(fk.parentTable)!;

        const existing = new Set(
          parentList.map((pr) => {
            const keyParts = fk.parentCols.map((col) => JSON.stringify((pr as RowDataPacket)[col]));
            return keyParts.join('|');
          })
        );

        const needTuples: unknown[][] = [];
        const seenNeed = new Set<string>();
        for (const cr of childRows) {
          const tup = fk.parentCols.map((_, i) => (cr as RowDataPacket)[fk.childCols[i]]);
          if (tup.some((v) => v === null || v === undefined)) continue;
          const refKey = tup.map((v) => JSON.stringify(v)).join('|');
          if (existing.has(refKey)) continue;
          if (seenNeed.has(refKey)) continue;
          seenNeed.add(refKey);
          needTuples.push(tup);
        }

        for (const tup of needTuples) {
          if (closureUsed >= MAX_CLOSURE) break;
          if (fk.parentCols.length === 1) {
            const [pr] = await conn.query<RowDataPacket[]>(
              `SELECT * FROM ${escIdent(fk.parentTable)} WHERE ${escIdent(fk.parentCols[0])} = ? LIMIT 1`,
              [tup[0]]
            );
            if (pr[0]) {
              const row = pr[0];
              const rk = rowKey(fk.parentTable, pkP, row as Record<string, unknown>);
              if (!parentSeen.has(rk)) {
                parentSeen.add(rk);
                parentList.push(row);
                closureUsed++;
              }
            }
          } else {
            const cond = fk.parentCols.map((c) => `${escIdent(c)} = ?`).join(' AND ');
            const [pr] = await conn.query<RowDataPacket[]>(
              `SELECT * FROM ${escIdent(fk.parentTable)} WHERE ${cond} LIMIT 1`,
              tup
            );
            if (pr[0]) {
              const row = pr[0];
              const rk = rowKey(fk.parentTable, pkP, row as Record<string, unknown>);
              if (!parentSeen.has(rk)) {
                parentSeen.add(rk);
                parentList.push(row);
                closureUsed++;
              }
            }
          }
        }
        samples.set(fk.parentTable, parentList);
      }
    };

    await addParentClosure();

    const fkSummary = fks.map((fk) => ({
      child: fk.childTable,
      parent: fk.parentTable,
      constraint: fk.constraintName,
      columns: fk.childCols.map((c, i) => ({ child: c, parent: fk.parentCols[i] })),
    }));

    const payload = {
      meta: {
        database,
        host,
        generatedAt: new Date().toISOString(),
        sampleLimit: SAMPLE_LIMIT,
        topologicalOrder: order,
        closureRowsAdded: closureUsed,
        maxClosure: MAX_CLOSURE,
      },
      foreignKeys: fkSummary,
      tables: Object.fromEntries(
        [...samples.entries()].map(([name, rows]) => [
          name,
          {
            primaryKey: pkByTable.get(name) ?? [],
            rowCount: rows.length,
            rows,
          },
        ])
      ),
    };

    const jsonPath = path.join(outDir, 'sample.json');
    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`[db:dump-sample] Amostra: ${jsonPath}`);
    console.log(`[db:dump-sample] FKs: ${fks.length} | linhas extras (closure): ${closureUsed}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('[db:dump-sample]', err);
  process.exit(1);
});
