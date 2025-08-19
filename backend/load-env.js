// Simple dotenv loader for Node.js
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const envPath = join(__dirname, '..', '.env');
  const envFile = readFileSync(envPath, 'utf8');
  
  envFile
    .split('\n')
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    });
    
  console.log('✅ Environment variables loaded');
} catch (error) {
  console.warn('⚠️ Could not load .env file:', error.message);
}