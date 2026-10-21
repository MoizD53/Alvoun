import fs from 'fs';
import path from 'path';

function walk(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function audit() {
  console.log('=== VERCEL STORAGE USAGE & PRODUCTION DATA SCOPE AUDIT ===\n');

  // 1. Check Git Tracked Files
  console.log('--- 1. GIT TRACKING STATUS ---');
  const gitIgnore = fs.existsSync('.gitignore') ? fs.readFileSync('.gitignore', 'utf8') : '';
  const hasVercelIgnore = fs.existsSync('.vercelignore');
  console.log('.vercelignore exists:', hasVercelIgnore);
  console.log('.gitignore ignores /backups/:', gitIgnore.includes('/backups/'));
  console.log('.gitignore ignores *.enc:', gitIgnore.includes('*.enc'));
  console.log('.gitignore ignores *.xlsx:', gitIgnore.includes('*.xlsx'));
  console.log('.gitignore ignores *.db:', gitIgnore.includes('*.db'));

  // 2. Scan all .nft.json files in .next/server
  console.log('\n--- 2. NFT (NODE FILE TRACE) SERVERLESS FUNCTION BUNDLE AUDIT ---');
  const nftFiles = walk('.next/server').filter(f => f.endsWith('.nft.json'));
  console.log(`Total NFT manifests scanned across routes: ${nftFiles.length}`);

  let backupsTracedCount = 0;
  let devDbTracedCount = 0;
  let xlsxTracedCount = 0;
  const tracedSample: Set<string> = new Set();
  const fileOccurrences: Map<string, number> = new Map();

  for (const nftPath of nftFiles) {
    try {
      const content = JSON.parse(fs.readFileSync(nftPath, 'utf8'));
      const files: string[] = content.files || [];
      for (const f of files) {
        fileOccurrences.set(f, (fileOccurrences.get(f) || 0) + 1);
        if (f.toLowerCase().includes('backup')) {
          backupsTracedCount++;
          tracedSample.add(f);
        }
        if (f.toLowerCase().includes('.db')) {
          devDbTracedCount++;
          tracedSample.add(f);
        }
        if (f.toLowerCase().includes('.xlsx')) {
          xlsxTracedCount++;
          tracedSample.add(f);
        }
      }
    } catch {}
  }

  console.log(`Backup files traced into functions: ${backupsTracedCount}`);
  console.log(`Database (.db) files traced into functions: ${devDbTracedCount}`);
  console.log(`Spreadsheet (.xlsx) files traced into functions: ${xlsxTracedCount}`);

  if (tracedSample.size > 0) {
    console.log('Traced suspicious files:', Array.from(tracedSample));
  } else {
    console.log('✓ Confirmed: ZERO backup files (.json, .enc) or spreadsheets (.xlsx) are traced into any serverless function bundle.');
  }

  // 3. Inspect largest dependencies traced across functions
  console.log('\n--- 3. TOP TRACED DEPENDENCIES IN SERVERLESS FUNCTIONS ---');
  const sortedFiles = Array.from(fileOccurrences.entries())
    .sort((a, b) => b[1] - a[1]);

  console.log('Most frequently bundled files across all lambdas:');
  for (const [file, count] of sortedFiles.slice(0, 10)) {
    console.log(`  [${count} functions] ${file}`);
  }

  // 4. Calculate actual build output sizes
  console.log('\n--- 4. NEXT.JS BUILD ARTIFACTS SIZES (.next) ---');
  const nextDirs = ['server', 'static', 'cache'];
  for (const d of nextDirs) {
    const fullPath = path.join('.next', d);
    if (fs.existsSync(fullPath)) {
      const allFiles = walk(fullPath);
      let totalBytes = 0;
      for (const f of allFiles) {
        totalBytes += fs.statSync(f).size;
      }
      console.log(`  .next/${d}: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB (${allFiles.length} files)`);
    }
  }

  // 5. Inspect Runtime Writes in App Code
  console.log('\n--- 5. RUNTIME FILESYSTEM WRITES IN CODEBASE ---');
  const srcFiles = walk('src').filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
  const writePatterns = ['writeFileSync', 'writeFile', 'createWriteStream', 'mkdirSync'];
  const writeOccurrences: { file: string; line: string }[] = [];

  for (const sf of srcFiles) {
    const lines = fs.readFileSync(sf, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (writePatterns.some(p => line.includes(p)) && !line.trim().startsWith('//')) {
        writeOccurrences.push({ file: sf, line: `L${i + 1}: ${line.trim()}` });
      }
    }
  }

  console.log(`Found ${writeOccurrences.length} filesystem write call(s) in application code:`);
  for (const w of writeOccurrences) {
    console.log(`  ${w.file} -> ${w.line}`);
  }

  // 6. Inspect Backups directory
  console.log('\n--- 6. LOCAL BACKUPS DIRECTORY AUDIT ---');
  if (fs.existsSync('backups')) {
    const backupFiles = fs.readdirSync('backups');
    let totalBackupBytes = 0;
    for (const bf of backupFiles) {
      const stat = fs.statSync(path.join('backups', bf));
      totalBackupBytes += stat.size;
      console.log(`  backups/${bf}: ${(stat.size / 1024).toFixed(1)} KB`);
    }
    console.log(`Total local backups size: ${(totalBackupBytes / 1024).toFixed(1)} KB across ${backupFiles.length} files.`);
  } else {
    console.log('backups directory does not exist.');
  }
}

audit().catch(console.error);
