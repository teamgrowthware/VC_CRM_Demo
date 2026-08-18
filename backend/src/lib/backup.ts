import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(__dirname, '../../backups');
const BACKUP_KEEP = parseInt(process.env.BACKUP_KEEP || '14', 10);

interface BackupTable {
  columns: string[];
  rows: any[][];
}

interface BackupData {
  timestamp: string;
  database: string;
  tables: Record<string, BackupTable>;
}

const loadEnv = () => {
  const candidates = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p, quiet: true });
    }
  }
};

const getConnectionUrl = (): string => {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL / DIRECT_URL is not set. Cannot create backup.');
  return url;
};

const getClient = () => new Client({ connectionString: getConnectionUrl() });

const getTables = async (client: Client): Promise<string[]> => {
  const res = await client.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  return res.rows.map((r) => r.table_name as string).filter((t) => t !== '_prisma_migrations');
};

const normalizeValue = (v: any): any => {
  if (Buffer.isBuffer(v)) return { __type: 'bytea', hex: v.toString('hex') };
  if (v instanceof Date) return v.toISOString();
  return v;
};

const deNormalizeValue = (v: any): any => {
  if (v && typeof v === 'object' && v.__type === 'bytea') return Buffer.from(v.hex, 'hex');
  return v;
};

const formatStamp = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

const pruneOldBackups = () => {
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json')).sort();
  while (files.length > BACKUP_KEEP) {
    const old = files.shift()!;
    const oldPath = path.join(BACKUP_DIR, old);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    const sqlPath = path.join(BACKUP_DIR, old.replace(/\.json$/, '.sql'));
    if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
  }
};

export const runBackup = async (): Promise<{ jsonFile: string; sqlFile: string; tables: number; rows: number }> => {
  loadEnv();
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const client = getClient();
  await client.connect();
  try {
    const timestamp = new Date();
    const stamp = formatStamp(timestamp);
    const jsonFile = path.join(BACKUP_DIR, `backup_${stamp}.json`);
    const sqlFile = path.join(BACKUP_DIR, `backup_${stamp}.sql`);

    const tables = await getTables(client);
    const data: BackupData = {
      timestamp: timestamp.toISOString(),
      database: new URL(getConnectionUrl()).host,
      tables: {},
    };

    const sqlLines: string[] = [
      `-- Vortex CRM database data backup generated at ${timestamp.toISOString()}`,
      '-- NOTE: Run `prisma db push` first to (re)create the schema, then restore this file with psql:',
      '--   psql "$DIRECT_URL" -f <this file>',
      '',
    ];

    let totalRows = 0;
    for (const table of tables) {
      const sel = await client.query(`SELECT * FROM "${table}"`);
      const columns = sel.fields.map((f) => f.name);
      const rows = sel.rows.map((r) => columns.map((c) => normalizeValue(r[c])));
      data.tables[table] = { columns, rows };
      totalRows += rows.length;

      const copyRes = await client.query(`COPY (SELECT * FROM "${table}") TO STDOUT`);
      const copyLines = copyRes.rows as unknown as string[];
      sqlLines.push(`COPY "${table}" (${columns.map((c) => `"${c}"`).join(', ')}) FROM STDIN;`);
      sqlLines.push(...copyLines);
      sqlLines.push('\\.');
      sqlLines.push('');
    }

    fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2), 'utf8');
    fs.writeFileSync(sqlFile, sqlLines.join('\n'), 'utf8');
    pruneOldBackups();

    return { jsonFile, sqlFile, tables: tables.length, rows: totalRows };
  } finally {
    await client.end();
  }
};

const topoOrder = async (client: Client, tableSet: Set<string>): Promise<string[]> => {
  const res = await client.query(
    `SELECT tc.table_name AS child, ccu.table_name AS parent
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
     WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`
  );

  const children = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const t of tableSet) {
    children.set(t, []);
    indegree.set(t, 0);
  }

  for (const r of res.rows) {
    const child = r.child as string;
    const parent = r.parent as string;
    if (!tableSet.has(child) || !tableSet.has(parent)) continue;
    children.get(parent)!.push(child);
    indegree.set(child, indegree.get(child)! + 1);
  }

  const queue = [...tableSet].filter((t) => indegree.get(t) === 0).sort();
  const order: string[] = [];
  while (queue.length) {
    const t = queue.shift()!;
    order.push(t);
    for (const c of children.get(t)!) {
      indegree.set(c, indegree.get(c)! - 1);
      if (indegree.get(c) === 0) queue.push(c);
    }
    queue.sort();
  }
  return order;
};

const fixSequences = async (client: Client, tables: string[]) => {
  for (const t of tables) {
    const res = await client.query(
      `SELECT pg_get_serial_sequence('"${t}"', a.attname) AS seq, a.attname AS col
       FROM pg_attribute a
       JOIN pg_class c ON a.attrelid = c.oid
       JOIN pg_namespace n ON c.relnamespace = n.oid
       WHERE n.nspname = 'public' AND c.relname = $1 AND a.attnum > 0 AND NOT a.attisdropped
         AND pg_get_serial_sequence('"${t}"', a.attname) IS NOT NULL`,
      [t]
    );
    for (const row of res.rows) {
      await client.query(`SELECT setval($1, COALESCE((SELECT MAX(${row.col}) FROM "${t}"), 1))`, [row.seq]);
    }
  }
};

const latestBackup = (): string => {
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json')).sort();
  if (!files.length) throw new Error('No backups found in ' + BACKUP_DIR);
  return path.join(BACKUP_DIR, files[files.length - 1]);
};

export const restoreBackup = async (file?: string): Promise<{ file: string; tables: number }> => {
  loadEnv();
  const jsonFile = file ? (path.isAbsolute(file) ? file : path.resolve(process.cwd(), file)) : latestBackup();
  if (!fs.existsSync(jsonFile)) throw new Error('Backup file not found: ' + jsonFile);

  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8')) as BackupData;
  const client = getClient();
  await client.connect();
  try {
    await client.query('BEGIN');

    const tableSet = new Set(Object.keys(data.tables));
    const order = await topoOrder(client, tableSet);
    const ordered = order;

    for (const t of tableSet) {
      await client.query(`TRUNCATE TABLE "${t}" CASCADE`);
    }

    for (const table of ordered) {
      const t = data.tables[table];
      if (!t) continue;
      const cols = t.columns;
      const colList = cols.map((c) => `"${c}"`).join(', ');
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const insertSql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`;
      for (const row of t.rows) {
        await client.query(insertSql, row.map((v) => deNormalizeValue(v)));
      }
    }

    await fixSequences(client, ordered);
    await client.query('COMMIT');
    return { file: jsonFile, tables: ordered.length };
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      /* noop */
    }
    throw e;
  } finally {
    await client.end();
  }
};
