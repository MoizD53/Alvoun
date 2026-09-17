const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, 'src');

const replacements = [
  { regex: /divide-slate-100(?!\s*dark:)/g, replace: 'divide-slate-100 dark:divide-slate-800' },
  { regex: /border-slate-100(?!\s*dark:)/g, replace: 'border-slate-100 dark:border-slate-800' },
  { regex: /bg-slate-50\/50(?!\s*dark:)/g, replace: 'bg-slate-50/50 dark:bg-slate-900/50' },
  { regex: /bg-green-50(?!\s*dark:)/g, replace: 'bg-green-50 dark:bg-green-900/20' },
  { regex: /bg-blue-50(?!\s*dark:)/g, replace: 'bg-blue-50 dark:bg-blue-900/20' },
  { regex: /bg-amber-50(?!\s*dark:)/g, replace: 'bg-amber-50 dark:bg-amber-900/20' },
  { regex: /bg-red-50(?!\s*dark:)/g, replace: 'bg-red-50 dark:bg-red-900/20' },
  { regex: /border-white(?!\s*dark:)/g, replace: 'border-white dark:border-slate-950' },
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(dirPath);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  replacements.forEach(({regex, replace}) => {
    content = content.replace(regex, replace);
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
