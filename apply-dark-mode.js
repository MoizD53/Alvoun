const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, 'src');

const replacements = [
  // Backgrounds
  { regex: /bg-white(?!\s*dark:)/g, replace: 'bg-white dark:bg-slate-950' },
  { regex: /bg-slate-50(?!\s*dark:)/g, replace: 'bg-slate-50 dark:bg-slate-900' },
  { regex: /bg-slate-100(?!\s*dark:)/g, replace: 'bg-slate-100 dark:bg-slate-800' },
  { regex: /bg-slate-200(?!\s*dark:)/g, replace: 'bg-slate-200 dark:bg-slate-700' },
  { regex: /bg-gray-50(?!\s*dark:)/g, replace: 'bg-gray-50 dark:bg-slate-900' },
  { regex: /bg-gray-100(?!\s*dark:)/g, replace: 'bg-gray-100 dark:bg-slate-800' },
  // Text
  { regex: /text-slate-900(?!\s*dark:)/g, replace: 'text-slate-900 dark:text-slate-100' },
  { regex: /text-slate-800(?!\s*dark:)/g, replace: 'text-slate-800 dark:text-slate-200' },
  { regex: /text-slate-700(?!\s*dark:)/g, replace: 'text-slate-700 dark:text-slate-300' },
  { regex: /text-slate-600(?!\s*dark:)/g, replace: 'text-slate-600 dark:text-slate-400' },
  { regex: /text-slate-500(?!\s*dark:)/g, replace: 'text-slate-500 dark:text-slate-400' },
  { regex: /text-gray-900(?!\s*dark:)/g, replace: 'text-gray-900 dark:text-slate-100' },
  { regex: /text-gray-800(?!\s*dark:)/g, replace: 'text-gray-800 dark:text-slate-200' },
  { regex: /text-gray-700(?!\s*dark:)/g, replace: 'text-gray-700 dark:text-slate-300' },
  { regex: /text-gray-600(?!\s*dark:)/g, replace: 'text-gray-600 dark:text-slate-400' },
  { regex: /text-gray-500(?!\s*dark:)/g, replace: 'text-gray-500 dark:text-slate-400' },
  // Borders
  { regex: /border-slate-200(?!\s*dark:)/g, replace: 'border-slate-200 dark:border-slate-800' },
  { regex: /border-slate-300(?!\s*dark:)/g, replace: 'border-slate-300 dark:border-slate-700' },
  { regex: /border-gray-200(?!\s*dark:)/g, replace: 'border-gray-200 dark:border-slate-800' },
  { regex: /border-gray-300(?!\s*dark:)/g, replace: 'border-gray-300 dark:border-slate-700' },
  // Divide
  { regex: /divide-slate-200(?!\s*dark:)/g, replace: 'divide-slate-200 dark:divide-slate-800' },
  { regex: /divide-gray-200(?!\s*dark:)/g, replace: 'divide-gray-200 dark:divide-slate-800' },
  // Hover states (careful with these, usually we want dark:hover:...)
  // Let's just do standard hover background replacements
  { regex: /hover:bg-slate-50(?!\s*dark:)/g, replace: 'hover:bg-slate-50 dark:hover:bg-slate-900' },
  { regex: /hover:bg-gray-50(?!\s*dark:)/g, replace: 'hover:bg-gray-50 dark:hover:bg-slate-900' },
  { regex: /hover:bg-slate-100(?!\s*dark:)/g, replace: 'hover:bg-slate-100 dark:hover:bg-slate-800' },
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
  
  // Specific fix for active sidebar items that use alvoun-light
  content = content.replace(/'bg-alvoun-light text-alvoun-blue'/g, "'bg-alvoun-light dark:bg-alvoun-blue/20 text-alvoun-blue dark:text-alvoun-blue'");

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
