import { runBackup } from '../lib/backup';

const main = async () => {
  console.log('[Backup] Starting database backup...');
  const result = await runBackup();
  console.log(`[Backup] Done. ${result.tables} tables, ${result.rows} rows.`);
  console.log(`  JSON: ${result.jsonFile}`);
  console.log(`  SQL : ${result.sqlFile}`);
  process.exit(0);
};

main().catch((e) => {
  console.error('[Backup] FAILED:', e);
  process.exit(1);
});
