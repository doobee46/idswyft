import Stripe from 'stripe';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

export class BillingService {
  private stripe: Stripe;

  constructor() {
    if (!config.stripe.secretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2024-12-18.acacia' as any,
    });
  }

  async createCustomer(orgId: string, email: string, name: string): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: { orgId },
    });
    logger.info('Stripe customer created', { orgId, customerId: customer.id });
    return customer.id;
  }

  async createSubscription(
    customerId: string,
    tier: 'starter' | 'professional' | 'enterprise'
  ): Promise<{ subscriptionId: string; clientSecret: string | null }> {
    const priceIds: Record<string, string | undefined> = {
      starter: process.env.STRIPE_STARTER_PRICE_ID,
      professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    };

    const priceId = priceIds[tier];
    if (!priceId) {
      throw new Error(`STRIPE_${tier.toUpperCase()}_PRICE_ID not configured`);
    }

    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent | null;
    const clientSecret = paymentIntent?.client_secret ?? null;

    logger.info('Stripe subscription created', { customerId, tier, subscriptionId: subscription.id });
    return { subscriptionId: subscription.id, clientSecret };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(subscriptionId);
    logger.info('Stripe subscription cancelled', { subscriptionId });
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<Stripe.Event> {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret
    );
  }
}
