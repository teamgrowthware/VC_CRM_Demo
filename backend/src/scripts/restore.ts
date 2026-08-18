import { restoreBackup } from '../lib/backup';

const main = async () => {
  const args = process.argv.slice(2);
  if (!args.includes('--yes')) {
    console.error('WARNING: This will TRUNCATE and replace ALL data in the database.');
    console.error('Usage: npm run restore -- [backup_file.json] --yes');
    process.exit(1);
  }
  const file = args.find((a) => !a.startsWith('--')) || undefined;
  console.log('[Restore] Starting restore...');
  const result = await restoreBackup(file);
  console.log(`[Restore] Done. Restored ${result.tables} tables from ${result.file}`);
  process.exit(0);
};

main().catch((e) => {
  console.error('[Restore] FAILED:', e);
  process.exit(1);
});
