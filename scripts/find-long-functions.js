import fs from 'fs';
import { globSync } from 'glob';

const files = [...globSync('src/**/*.ts'), ...globSync('src/**/*.svelte')];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  let inFunction = false;
  let functionStart = 0;
  let functionName = '';
  let braceCount = 0;
  
  lines.forEach((line, index) => {
    const match = line.match(/function\s+(\w+)|const\s+(\w+)\s*=.*=>|^\s*(\w+)\s*\([^)]*\)\s*{/);
    if (match && !inFunction) {
      inFunction = true;
      functionStart = index;
      functionName = match[1] || match[2] || match[3] || 'anonymous';
      braceCount = 0;
    }
    
    if (inFunction) {
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      if (braceCount === 0 && line.includes('}')) {
        const functionLength = index - functionStart;
        if (functionLength > 60) {
          console.log(`${file}:${functionStart + 1} - ${functionName} (${functionLength} lines)`);
        }
        inFunction = false;
      }
    }
  });
});