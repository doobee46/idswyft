import { authenticator } from 'otplib';
import QRCode from 'qrcode';

/**
 * TotpService wraps otplib to provide TOTP (RFC 6238) operations for admin 2FA.
 *
 * Flow:
 * 1. Admin calls POST /api/auth/totp/setup → gets a QR code + raw secret
 * 2. Admin scans the QR code with an authenticator app (Google Auth, Authy, etc.)
 * 3. Admin calls POST /api/auth/totp/verify with the first 6-digit code to confirm
 *    the secret was stored correctly → totp_enabled is set to true
 * 4. On subsequent logins, if totp_enabled, the login requires a totp_token field
 */
export class TotpService {
  generateSecret(): string {
    return authenticator.generateSecret(32);
  }

  async generateQrCode(email: string, secret: string): Promise<string> {
    const otpAuthUrl = authenticator.keyuri(email, 'Idswyft Admin', secret);
    return QRCode.toDataURL(otpAuthUrl);
  }

  verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch {
      return false; // malformed token (wrong length, non-numeric, etc.)
    }
  }
}
