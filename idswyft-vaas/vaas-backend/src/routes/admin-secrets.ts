import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, requireSuperAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Secret configuration
const SECRETS_CONFIG = {
  VAAS_JWT_SECRET: { length: 64, description: 'JWT signing secret for VaaS authentication', critical: true },
  VAAS_API_KEY_SECRET: { length: 64, description: 'API key encryption secret', critical: true },
  IDSWYFT_SERVICE_TOKEN: { length: 64, description: 'Service-to-service authentication token', critical: true },
  VAAS_WEBHOOK_SECRET: { length: 32, description: 'Webhook signature secret', critical: false },
  VAAS_ENCRYPTION_KEY: { length: 32, description: 'Data encryption key (AES-256)', critical: true },
  VAAS_SESSION_SECRET: { length: 32, description: 'Session encryption secret', critical: false }
};

// Generate cryptographically secure secret
function generateSecret(length: number): string {
  return crypto.randomBytes(length).toString('hex');
}

// Generate service UUID
function generateServiceUUID(): string {
  return crypto.randomUUID();
}

// Admin secret generation page (HTML interface)
router.get('/secrets/generate', requireAuth, requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VaaS Secret Generator - Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1000px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
        .header h1 { font-size: 24px; margin-bottom: 8px; }
        .header p { opacity: 0.9; }
        .content { padding: 30px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
        .warning strong { display: block; margin-bottom: 5px; }
        .controls { display: flex; gap: 15px; margin-bottom: 25px; flex-wrap: wrap; }
        .btn { padding: 12px 24px; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; transition: all 0.2s; text-decoration: none; display: inline-block; }
        .btn-primary { background: #007bff; color: white; }
        .btn-primary:hover { background: #0056b3; }
        .btn-danger { background: #dc3545; color: white; }
        .btn-danger:hover { background: #c82333; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-secondary:hover { background: #545b62; }
        .secrets-grid { display: grid; gap: 20px; margin-bottom: 25px; }
        .secret-card { border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; background: #f8f9fa; }
        .secret-card.critical { border-left: 4px solid #dc3545; }
        .secret-name { font-weight: 600; color: #495057; margin-bottom: 5px; }
        .secret-description { font-size: 14px; color: #6c757d; margin-bottom: 15px; }
        .secret-value { font-family: 'Courier New', monospace; background: #e9ecef; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 12px; position: relative; }
        .copy-btn { position: absolute; top: 5px; right: 5px; background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; font-size: 11px; cursor: pointer; }
        .copy-btn:hover { background: #218838; }
        .env-output { background: #2d3748; color: #e2e8f0; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 13px; white-space: pre-line; max-height: 400px; overflow-y: auto; }
        .metadata { background: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .metadata h3 { color: #1976d2; margin-bottom: 10px; }
        .hidden { display: none; }
        .loading { text-align: center; padding: 40px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 VaaS Secret Generator</h1>
            <p>Generate secure cryptographic secrets for VaaS deployment</p>
        </div>
        
        <div class="content">
            <div class="warning">
                <strong>⚠️ Security Warning</strong>
                These secrets provide full access to your VaaS system. Keep them secure and never commit to version control.
                After generating, immediately update your Railway environment variables and restart services.
            </div>

            <div class="controls">
                <button id="generateBtn" class="btn btn-primary">🎲 Generate New Secrets</button>
                <button id="copyAllBtn" class="btn btn-secondary hidden">📋 Copy All as ENV</button>
                <button id="downloadBtn" class="btn btn-secondary hidden">💾 Download as File</button>
                <button id="clearBtn" class="btn btn-danger hidden">🗑️ Clear Secrets</button>
            </div>

            <div id="loading" class="loading hidden">
                <div>🔄 Generating secure secrets...</div>
            </div>

            <div id="secrets-container" class="hidden">
                <div id="secrets-grid" class="secrets-grid"></div>
                
                <div class="env-output-container">
                    <h3>Environment Variables Format:</h3>
                    <div id="env-output" class="env-output"></div>
                </div>

                <div id="metadata" class="metadata"></div>
            </div>
        </div>
    </div>

    <script>
        let currentSecrets = null;
        
        document.getElementById('generateBtn').addEventListener('click', generateSecrets);
        document.getElementById('copyAllBtn').addEventListener('click', copyAllSecrets);
        document.getElementById('downloadBtn').addEventListener('click', downloadSecrets);
        document.getElementById('clearBtn').addEventListener('click', clearSecrets);

        async function generateSecrets() {
            const loading = document.getElementById('loading');
            const container = document.getElementById('secrets-container');
            const controls = document.querySelectorAll('.btn:not(#generateBtn)');
            
            loading.classList.remove('hidden');
            container.classList.add('hidden');
            controls.forEach(btn => btn.classList.add('hidden'));

            try {
                const response = await fetch('/api/admin/secrets/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (!response.ok) throw new Error('Failed to generate secrets');
                
                const data = await response.json();
                currentSecrets = data;
                displaySecrets(data);
                
                controls.forEach(btn => btn.classList.remove('hidden'));
            } catch (error) {
                alert('Error generating secrets: ' + error.message);
            } finally {
                loading.classList.add('hidden');
            }
        }

        function displaySecrets(data) {
            const grid = document.getElementById('secrets-grid');
            const envOutput = document.getElementById('env-output');
            const metadata = document.getElementById('metadata');
            
            // Display individual secrets
            grid.innerHTML = '';
            Object.entries(data.secrets).forEach(([key, value]) => {
                const config = data.config[key];
                const card = document.createElement('div');
                card.className = \`secret-card \${config.critical ? 'critical' : ''}\`;
                card.innerHTML = \`
                    <div class="secret-name">\${key} \${config.critical ? '🔴' : '🟡'}</div>
                    <div class="secret-description">\${config.description}</div>
                    <div class="secret-value">
                        \${value}
                        <button class="copy-btn" onclick="copySecret('\${value}')">Copy</button>
                    </div>
                \`;
                grid.appendChild(card);
            });

            // Display ENV format
            envOutput.textContent = data.env_format;

            // Display metadata
            metadata.innerHTML = \`
                <h3>Generation Metadata</h3>
                <p><strong>Generated:</strong> \${data.metadata.generated_at}</p>
                <p><strong>Service ID:</strong> \${data.metadata.service_id}</p>
                <p><strong>Version:</strong> \${data.metadata.version}</p>
            \`;

            document.getElementById('secrets-container').classList.remove('hidden');
        }

        function copySecret(value) {
            navigator.clipboard.writeText(value).then(() => {
                // Visual feedback could be added here
            });
        }

        function copyAllSecrets() {
            if (currentSecrets) {
                navigator.clipboard.writeText(currentSecrets.env_format).then(() => {
                    alert('All secrets copied to clipboard!');
                });
            }
        }

        function downloadSecrets() {
            if (currentSecrets) {
                const blob = new Blob([currentSecrets.env_format], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = \`vaas-secrets-\${new Date().toISOString().split('T')[0]}.env\`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        }

        function clearSecrets() {
            if (confirm('Are you sure you want to clear all displayed secrets?')) {
                document.getElementById('secrets-container').classList.add('hidden');
                document.querySelectorAll('.btn:not(#generateBtn)').forEach(btn => btn.classList.add('hidden'));
                currentSecrets = null;
            }
        }
    </script>
</body>
</html>
  `;
  
  res.send(html);
});

// API endpoint to generate secrets (JSON)
router.post('/secrets/generate', requireAuth, requireSuperAdmin, catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const secrets: Record<string, string> = {};
  const metadata = {
    generated_at: new Date().toISOString(),
    generated_by: 'VaaS Admin Panel',
    service_id: generateServiceUUID(),
    version: '1.0.0',
    admin_user: req.admin?.email || 'unknown'
  };

  // Generate each secret
  Object.entries(SECRETS_CONFIG).forEach(([key, config]) => {
    secrets[key] = generateSecret(config.length);
  });

  // Format as environment variables
  let envFormat = `# VaaS Production Secrets\\n`;
  envFormat += `# Generated: ${metadata.generated_at}\\n`;
  envFormat += `# Service ID: ${metadata.service_id}\\n`;
  envFormat += `# Generated by: ${metadata.admin_user}\\n`;
  envFormat += `# DO NOT COMMIT TO VERSION CONTROL\\n\\n`;

  Object.entries(secrets).forEach(([key, value]) => {
    const description = (SECRETS_CONFIG as any)[key].description;
    envFormat += `# ${description}\\n`;
    envFormat += `${key}=${value}\\n\\n`;
  });

  // Log the generation (without secrets)
  logger.info('Admin generated new VaaS secrets', {
    admin_user: metadata.admin_user,
    service_id: metadata.service_id,
    secrets_generated: Object.keys(secrets),
    ip: req.ip
  });

  res.json({
    success: true,
    metadata,
    secrets,
    config: SECRETS_CONFIG,
    env_format: envFormat,
    instructions: [
      '1. Copy these secrets to your Railway environment variables',
      '2. Update your local .env files',
      '3. Restart your VaaS services',
      '4. Test the deployment',
      '5. Clear this page when done'
    ]
  });
}));

export default router;