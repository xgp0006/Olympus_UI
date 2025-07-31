#!/usr/bin/env node

/**
 * NASA JPL Power of 10 Compliant SRI Hash Generator
 * Generates subresource integrity hashes for external resources
 * Aerospace-grade security implementation
 */

const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * External resources requiring SRI validation
 * NASA JPL Rule 2: Bounded arrays for resource lists
 */
const EXTERNAL_RESOURCES = [
  {
    url: 'https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.css',
    placeholder: 'PLACEHOLDER-MAPLIBRE-HASH',
    description: 'MapLibre GL CSS'
  },
  {
    url: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap',
    placeholder: 'PLACEHOLDER-FIRA-CODE-HASH',
    description: 'Fira Code Font'
  },
  {
    url: 'https://fonts.googleapis.com/icon?family=Material+Icons',
    placeholder: 'PLACEHOLDER-MATERIAL-ICONS-HASH',
    description: 'Material Icons Font'
  },
  {
    url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap',
    placeholder: 'PLACEHOLDER-JETBRAINS-MONO-HASH',
    description: 'JetBrains Mono Font'
  }
];

const APP_HTML_PATH = path.join(process.cwd(), 'src', 'app.html');

/**
 * Fetch resource content with aerospace-grade error handling
 * NASA JPL Rule 7: All return codes checked
 */
async function fetchResource(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        resolve(data);
      });
    });

    request.on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });

    // NASA JPL Rule 2: Bounded timeout
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Generate SHA-384 integrity hash
 * NASA JPL Rule 5: All data validated
 */
function generateSHA384Hash(content) {
  const hash = crypto.createHash('sha384');
  hash.update(content, 'utf8');
  return `sha384-${hash.digest('base64')}`;
}

/**
 * Update app.html with generated hashes
 * NASA JPL Rule 7: All file operations checked
 */
function updateAppHtml(hashMap) {
  try {
    let content = fs.readFileSync(APP_HTML_PATH, 'utf8');
    
    for (const [placeholder, hash] of hashMap) {
      content = content.replace(placeholder, hash);
    }
    
    fs.writeFileSync(APP_HTML_PATH, content, 'utf8');
    console.log('✅ Updated app.html with SRI hashes');
  } catch (error) {
    throw new Error(`Failed to update app.html: ${error.message}`);
  }
}

/**
 * Main execution function
 * NASA JPL Rule 4: Function under 60 lines
 */
async function main() {
  console.log('🚀 Generating SRI hashes for aerospace-grade security...');
  
  const hashMap = new Map();
  
  try {
    // Process each resource with bounded retry
    for (const resource of EXTERNAL_RESOURCES) {
      console.log(`📦 Fetching ${resource.description}...`);
      
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const content = await fetchResource(resource.url);
          const hash = generateSHA384Hash(content);
          
          hashMap.set(resource.placeholder, hash);
          console.log(`✅ ${resource.description}: ${hash}`);
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error(`Failed to fetch ${resource.description}: ${error.message}`);
          }
          console.log(`⚠️  Retry ${attempts}/${maxAttempts} for ${resource.description}`);
        }
      }
    }
    
    // Update app.html with generated hashes
    updateAppHtml(hashMap);
    
    console.log('🎯 SRI hash generation completed successfully');
    console.log('🔒 Aerospace-grade subresource integrity enforced');
    
  } catch (error) {
    console.error('❌ SRI hash generation failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { main, generateSHA384Hash, fetchResource };