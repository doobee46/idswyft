#!/usr/bin/env node

/**
 * VaaS Secret Generator Script
 * Generates secure cryptographic secrets for VaaS deployment
 * 
 * Usage: node scripts/generate-secrets.js [--format json|env]
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SECRETS_CONFIG = {
  VAAS_JWT_SECRET: { length: 64, description: 'JWT signing secret for VaaS authentication' },
  VAAS_API_KEY_SECRET: { length: 64, description: 'API key encryption secret' },
  IDSWYFT_SERVICE_TOKEN: { length: 64, description: 'Service-to-service authentication token' },
  VAAS_WEBHOOK_SECRET: { length: 32, description: 'Webhook signature secret' },
  VAAS_ENCRYPTION_KEY: { length: 32, description: 'Data encryption key (AES-256)' },
  VAAS_SESSION_SECRET: { length: 32, description: 'Session encryption secret' }
};

// Generate cryptographically secure random bytes
function generateSecret(length) {
  return crypto.randomBytes(length).toString('hex');
}

// Generate UUID for service identification
function generateUUID() {
  return crypto.randomUUID();
}

// Generate all secrets
function generateAllSecrets() {
  const secrets = {};
  const metadata = {
    generated_at: new Date().toISOString(),
    generated_by: 'VaaS Secret Generator',
    service_id: generateUUID(),
    version: '1.0.0'
  };

  // Generate each secret
  Object.entries(SECRETS_CONFIG).forEach(([key, config]) => {
    secrets[key] = generateSecret(config.length);
  });

  return { secrets, metadata };
}

// Format output as environment variables
function formatAsEnv(secrets, metadata) {
  let output = `# VaaS Production Secrets\n`;
  output += `# Generated: ${metadata.generated_at}\n`;
  output += `# Service ID: ${metadata.service_id}\n`;
  output += `# DO NOT COMMIT TO VERSION CONTROL\n\n`;

  Object.entries(secrets).forEach(([key, value]) => {
    const description = SECRETS_CONFIG[key].description;
    output += `# ${description}\n`;
    output += `${key}=${value}\n\n`;
  });

  return output;
}

// Format output as JSON
function formatAsJson(secrets, metadata) {
  return JSON.stringify({
    metadata,
    secrets
  }, null, 2);
}

// Save secrets to file
function saveSecrets(content, format) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `vaas-secrets-${timestamp}.${format}`;
  const filepath = path.join(__dirname, '..', 'secrets', filename);
  
  // Ensure secrets directory exists
  const secretsDir = path.dirname(filepath);
  if (!fs.existsSync(secretsDir)) {
    fs.mkdirSync(secretsDir, { recursive: true });
  }

  fs.writeFileSync(filepath, content, { mode: 0o600 }); // Secure file permissions
  return filepath;
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'env';
  const saveToFile = args.includes('--save');
  const quiet = args.includes('--quiet');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
VaaS Secret Generator

Usage: node scripts/generate-secrets.js [options]

Options:
  --format <json|env>    Output format (default: env)
  --save                 Save to file in secrets/ directory
  --quiet               Suppress informational output
  --help, -h            Show this help message

Examples:
  node scripts/generate-secrets.js
  node scripts/generate-secrets.js --format json --save
  node scripts/generate-secrets.js --quiet > .env.production
    `);
    process.exit(0);
  }

  try {
    if (!quiet) {
      console.error('🔐 Generating VaaS production secrets...');
    }

    const { secrets, metadata } = generateAllSecrets();
    let content;

    switch (format) {
      case 'json':
        content = formatAsJson(secrets, metadata);
        break;
      case 'env':
      default:
        content = formatAsEnv(secrets, metadata);
        break;
    }

    if (saveToFile) {
      const filepath = saveSecrets(content, format === 'json' ? 'json' : 'env');
      if (!quiet) {
        console.error(`✅ Secrets saved to: ${filepath}`);
        console.error('⚠️  Keep this file secure and do not commit to version control!');
      }
    } else {
      console.log(content);
    }

    if (!quiet) {
      console.error('\\n🚀 Next steps:');
      console.error('1. Copy these secrets to your Railway environment variables');
      console.error('2. Update your local .env files');
      console.error('3. Restart your services');
      console.error('4. Test the deployment');
    }

  } catch (error) {
    console.error('❌ Error generating secrets:', error.message);
    process.exit(1);
  }
}

// Run if called directly  
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  generateAllSecrets,
  generateSecret,
  formatAsEnv,
  formatAsJson
};