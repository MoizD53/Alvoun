import dotenv from 'dotenv';
dotenv.config({ path: 'd:/alvoun/.env.local', override: true });
import { createClient } from '@libsql/client';

async function removeStaff() {
  console.log('Connecting to Turso to remove both staff members...');
  const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const staff = await turso.execute('SELECT id, employeeCode, name, phone FROM StaffMember;');
  console.log('Current staff members in DB:', staff.rows);

  const codesToDelete = ['EMP-001', 'EMP-002'];
  for (const row of staff.rows as any[]) {
    if (codesToDelete.includes(row.employeeCode) || row.name.includes('Vasim') || row.name.includes('Husenkhan')) {
      console.log(`Deleting attendance and payroll records for staff ${row.name} (${row.id})...`);
      await turso.execute({
        sql: 'DELETE FROM StaffAttendance WHERE staffId = ?;',
        args: [row.id]
      });
      await turso.execute({
        sql: 'DELETE FROM PayrollRecord WHERE staffId = ?;',
        args: [row.id]
      });
      console.log(`Deleting StaffMember ${row.name} (${row.employeeCode})...`);
      await turso.execute({
        sql: 'DELETE FROM StaffMember WHERE id = ?;',
        args: [row.id]
      });
      console.log(`✓ Deleted ${row.name}`);
    }
  }

  const remaining = await turso.execute('SELECT COUNT(*) as count FROM StaffMember;');
  console.log('Remaining StaffMember count:', remaining.rows[0].count);
}

removeStaff().catch(console.error);
