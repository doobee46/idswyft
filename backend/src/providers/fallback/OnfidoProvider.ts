import config from '@/config/index.js';
import { logger } from '@/utils/logger.js';

export class OnfidoProvider {
  private readonly baseUrl = 'https://api.onfido.com/v3.6';
  private readonly apiKey: string;

  constructor() {
    if (!config.externalApis.onfido) {
      throw new Error('Onfido API key not configured. Set ONFIDO_API_KEY');
    }
    this.apiKey = config.externalApis.onfido.apiKey;
  }

  /**
   * Creates an Onfido applicant and returns an SDK token for the client-side flow.
   */
  async createApplicant(userId: string, firstName: string, lastName: string): Promise<{ applicantId: string }> {
    const response = await fetch(`${this.baseUrl}/applicants`, {
      method: 'POST',
      headers: {
        Authorization: `Token token=${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        // Store our internal user ID as the Onfido reference
        dob: undefined, // optional
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Onfido create applicant failed ${response.status}: ${JSON.stringify(err)}`);
    }

    const data = await response.json();
    logger.info('Onfido applicant created', { userId, applicantId: data.id });

    return { applicantId: data.id };
  }

  async createSdkToken(applicantId: string, referrer: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/sdk_token`, {
      method: 'POST',
      headers: {
        Authorization: `Token token=${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ applicant_id: applicantId, referrer }),
    });

    if (!response.ok) {
      throw new Error(`Onfido SDK token creation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.token;
  }

  async getCheckStatus(checkId: string): Promise<'in_progress' | 'complete'> {
    const response = await fetch(`${this.baseUrl}/checks/${checkId}`, {
      headers: { Authorization: `Token token=${this.apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Onfido check status failed: ${response.status}`);
    }

    const data = await response.json();
    return data.status;
  }
}
