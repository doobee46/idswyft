import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth, requireSuperAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import {
  uploadOrgAsset,
  uploadPlatformAsset,
  getOrgAssets,
  getPlatformAssets,
} from '../services/assetService.js';
import { ASSET_TYPES, AssetType, VaasApiResponse } from '../types/index.js';
import config from '../config/index.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

function isSuperAdmin(email: string): boolean {
  return (config.superAdminEmails || '')
    .split(',')
    .map((e: string) => e.trim())
    .includes(email);
}

// GET /api/assets/platform — public, no auth required
router.get('/platform', async (_req: Request, res: Response) => {
  try {
    const branding = await getPlatformAssets();
    const response: VaasApiResponse = { success: true, data: branding };
    res.json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
});

// POST /api/assets/platform/:type — super admin only
router.post(
  '/platform/:type',
  requireSuperAdmin,
  upload.single('file') as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const assetType = req.params.type as AssetType;
      if (!ASSET_TYPES.includes(assetType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ASSET_TYPE',
            message: `type must be one of: ${ASSET_TYPES.join(', ')}`,
          },
        });
      }
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_FILE', message: 'No file uploaded' },
        });
      }
      const result = await uploadPlatformAsset(assetType, req.file);
      const response: VaasApiResponse = { success: true, data: result };
      res.json(response);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { code: 'UPLOAD_FAILED', message: error.message },
      });
    }
  }
);

// GET /api/assets/organizations/:id — requireAuth + own org or super admin
router.get(
  '/organizations/:id',
  requireAuth as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (req.admin!.organization_id !== id && !isSuperAdmin(req.admin!.email)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' },
        });
      }
      const assets = await getOrgAssets(id);
      const response: VaasApiResponse = { success: true, data: assets };
      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_FAILED', message: error.message },
      });
    }
  }
);

// POST /api/assets/organizations/:id/:type — requireAuth + own org or super admin
router.post(
  '/organizations/:id/:type',
  requireAuth as any,
  upload.single('file') as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const assetType = req.params.type as AssetType;

      if (req.admin!.organization_id !== id && !isSuperAdmin(req.admin!.email)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' },
        });
      }
      if (!ASSET_TYPES.includes(assetType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ASSET_TYPE',
            message: `type must be one of: ${ASSET_TYPES.join(', ')}`,
          },
        });
      }
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_FILE', message: 'No file uploaded' },
        });
      }

      const result = await uploadOrgAsset(id, assetType, req.file);
      const response: VaasApiResponse = { success: true, data: result };
      res.json(response);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { code: 'UPLOAD_FAILED', message: error.message },
      });
    }
  }
);

// Multer error handler — catches LIMIT_FILE_SIZE and returns 400 instead of 500.
// Must be a 4-argument handler so Express recognises it as an error middleware.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 2MB limit' },
    });
  }
  _next(err);
});

export default router;
