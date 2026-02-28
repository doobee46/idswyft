import config from '@/config/index.js';
import { logger } from '@/utils/logger.js';

export class PersonaProvider {
  private readonly baseUrl = 'https://withpersona.com/api/v1';
  private readonly apiKey: string;
  private readonly templateId: string;

  constructor() {
    if (!config.externalApis.persona) {
      throw new Error('Persona API key not configured. Set PERSONA_API_KEY and PERSONA_TEMPLATE_ID');
    }
    this.apiKey = config.externalApis.persona.apiKey;
    this.templateId = config.externalApis.persona.templateId;
  }

  async createInquiry(userId: string): Promise<{ inquiryId: string; redirectUrl: string }> {
    const response = await fetch(`${this.baseUrl}/inquiries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Persona-Version': '2023-01-05',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            'inquiry-template-id': this.templateId,
            'reference-id': userId,
          },
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Persona API error ${response.status}: ${JSON.stringify(err)}`);
    }

    const data = await response.json();
    logger.info('Persona inquiry created', { userId, inquiryId: data.data.id });

    return {
      inquiryId: data.data.id,
      redirectUrl: data.data.attributes['redirect-uri'],
    };
  }

  async getInquiryStatus(inquiryId: string): Promise<'approved' | 'declined' | 'pending'> {
    const response = await fetch(`${this.baseUrl}/inquiries/${inquiryId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Persona status check failed: ${response.status}`);
    }

    const data = await response.json();
    return data.data.attributes.status;
  }
}
