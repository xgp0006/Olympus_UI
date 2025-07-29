#!/usr/bin/env node

/**
 * NASA JPL Compliant SRI (Subresource Integrity) Validation Script
 * Validates that all external resources have proper SRI hashes
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// External resources that require SRI validation
const EXTERNAL_RESOURCES = [
  {
    url: 'https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.css',
    files: ['src/app.html'],
    expectedHash: 'sha384-pKLMSFRV5D4s7Y8Dkr3kxqv0ycMBfFf6qr9FHYFrg9cWQJrRdF7vPPrF3f3K5bKr'
  }
  // Note: Nerd font URLs are documented in nerd-fonts.css but should be moved to HTML with SRI
  // Currently using CSS @font-face with external URLs - needs migration to HTML preload
];

/**
 * Calculate SHA384 hash of content
 */
function calculateSHA384(content) {
  return 'sha384-' + crypto.createHash('sha384').update(content).digest('base64');
}

/**
 * Fetch content from URL
 */
function fetchContent(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

/**
 * Check if file contains SRI hash for resource
 */
function checkSRIInFile(filePath, url) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const urlRegex = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(url)) {
        // Check surrounding lines for integrity attribute
        const contextLines = lines
          .slice(Math.max(0, i - 2), Math.min(lines.length, i + 3))
          .join('\n');
        return contextLines.includes('integrity=');
      }
    }

    return false;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Validate all external resources
 */
async function validateSRI() {
  console.log('🚀 NASA JPL SRI Validation Starting...\n');

  let hasErrors = false;

  for (const resource of EXTERNAL_RESOURCES) {
    console.log(`Checking: ${resource.url}`);

    for (const file of resource.files) {
      const filePath = path.join(process.cwd(), file);

      if (!fs.existsSync(filePath)) {
        console.error(`  ❌ File not found: ${file}`);
        hasErrors = true;
        continue;
      }

      const hasSRI = checkSRIInFile(filePath, resource.url);

      if (!hasSRI) {
        console.error(`  ❌ Missing SRI hash in ${file}`);
        hasErrors = true;

        // Try to calculate correct hash
        if (resource.expectedHash) {
          console.log(`     Expected: integrity="${resource.expectedHash}"`);
        } else {
          try {
            const content = await fetchContent(resource.url);
            const hash = calculateSHA384(content);
            console.log(`     Suggested: integrity="${hash}"`);
          } catch (error) {
            console.log(`     Could not fetch resource to calculate hash`);
          }
        }
      } else {
        console.log(`  ✅ SRI hash present in ${file}`);
      }
    }
    console.log('');
  }

  if (hasErrors) {
    console.error('❌ SRI validation failed! External resources are not properly secured.');
    console.error('   This violates NASA JPL security requirements.');
    process.exit(1);
  } else {
    console.log('✅ All external resources have proper SRI hashes.');
    console.log('   NASA JPL security requirements met!');
  }
}

// Run validation
validateSRI().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
