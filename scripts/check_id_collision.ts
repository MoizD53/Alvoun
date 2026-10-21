import fs from 'fs';
import * as xlsx from 'xlsx';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';

async function checkCollision() {
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const existingInTurso = (await turso.execute('SELECT id, customerName FROM Customer;')).rows;
  const existingIdSet = new Set(existingInTurso.map(c => String(c.id)));
  console.log(`Existing in Turso: ${existingInTurso.length}`);

  const backup = JSON.parse(fs.readFileSync('backups/pre_migration_turso_raw_backup_2026-10-21.json', 'utf8'));
  const backupCusts: any[] = backup.Customer || [];
  const backupIdMap = new Map<string, string>();
  const backupRouteMap = new Map<string, string>();
  backup.Route.forEach((r: any) => backupRouteMap.set(r.id, r.name));
  backupCusts.forEach(c => {
    const rName = backupRouteMap.get(c.routeId) || '';
    backupIdMap.set(`${c.customerName.trim().toLowerCase()}|${rName.trim().toLowerCase()}`, c.id);
  });

  const wb = xlsx.readFile('d:/alvoun/an Alvoun.xlsx');
  const ws = wb.Sheets['Account'];
  const sheetRows: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[][];

  const seenIds = new Set<string>();

  for (let i = 0; i < sheetRows.length; i++) {
    const r = sheetRows[i];
    if (!r || r.length === 0) continue;
    const name = String(r[0] || '').trim();
    if (!name) continue;
    let routeName = r[1] ? String(r[1]).trim() : '';
    if (routeName.toLowerCase() === 'an alvoun') routeName = 'New Route';

    const originalBackupId = backupIdMap.get(`${name.toLowerCase()}|${routeName.toLowerCase()}`);
    if (originalBackupId) {
      if (seenIds.has(originalBackupId)) {
        console.log(`Duplicate backup ID seen in sheet: ${originalBackupId} for "${name}" (Row ${i + 2})`);
      }
      seenIds.add(originalBackupId);
    }
  }
}

checkCollision().catch(console.error);
