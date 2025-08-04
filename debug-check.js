#!/usr/bin/env node

import fs from 'fs';
import { globSync } from 'glob';

function getSourceFiles() {
  const allFiles = [...globSync('src/**/*.ts'), ...globSync('src/**/*.svelte')];
  // Exclude test files and utility implementations from NASA JPL validation
  return allFiles.filter(
    (file) =>
      !file.includes('__tests__') &&
      !file.includes('test.ts') &&
      !file.includes('bounded-array.ts') &&
      !file.includes('test-utils')
  );
}

// Check function lengths
function checkFunctionLength() {
  const files = getSourceFiles();
  let longFunctions = [];

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    let inFunction = false;
    let functionStart = 0;
    let braceCount = 0;

    lines.forEach((line, index) => {
      if (line.match(/function\s+\w+|=>\s*{|\w+\s*\([^)]*\)\s*{/)) {
        if (!inFunction) {
          inFunction = true;
          functionStart = index;
          braceCount = 0;
        }
      }

      if (inFunction) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        if (braceCount === 0 && line.includes('}')) {
          const functionLength = index - functionStart;
          if (functionLength > 60) {
            longFunctions.push({
              file,
              start: functionStart + 1,
              end: index + 1,
              length: functionLength
            });
          }
          inFunction = false;
        }
      }
    });
  });

  console.log('=== FUNCTION LENGTH VIOLATIONS ===');
  console.log(`Found ${longFunctions.length} functions over 60 lines:`);
  longFunctions.forEach((f) => {
    console.log(`${f.file}:${f.start}-${f.end} (${f.length} lines)`);
  });

  return longFunctions.length === 0;
}

// Check unbounded memory
function checkBoundedMemory() {
  const files = getSourceFiles();
  let unboundedOps = [];

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (line.match(/\.(push|unshift)\s*\(/)) {
        const context = lines
          .slice(Math.max(0, index - 15), Math.min(lines.length, index + 5))
          .join('\n');
        if (
          !context.match(
            /length\s*[<>=]|slice|shift|splice|BoundedArray|MAX_.*|\.length\s*>=|bounded\s*array|limit\s*reached|bounded\s*storage|errors:\s*BoundedArray|warnings:\s*BoundedArray|new\s+BoundedArray|const\s+\w+\s*=\s*new\s+BoundedArray|dismissedIds\s*=\s*new\s+BoundedArray/i
          )
        ) {
          unboundedOps.push({
            file,
            line: index + 1,
            content: line.trim(),
            context: context.trim()
          });
        }
      }
    });
  });

  console.log('\n=== BOUNDED MEMORY VIOLATIONS ===');
  console.log(`Found ${unboundedOps.length} unbounded operations:`);
  unboundedOps.forEach((op) => {
    console.log(`${op.file}:${op.line} - ${op.content}`);
    console.log(`  Context: ${op.context.replace(/\n/g, ' ')}`);
    console.log('');
  });

  return unboundedOps.length === 0;
}

// Run checks
checkFunctionLength();
checkBoundedMemory();
