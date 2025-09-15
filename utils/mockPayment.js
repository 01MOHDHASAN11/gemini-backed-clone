const crypto = require('crypto');
require('dotenv').config({ path: `${process.cwd()}/.env` });

class MockPayment {
  constructor() {
    this.secretKey = process.env.MOCK_PAYMENT_SECRET || 'mock_secret_key_123';
    this.webhookSecret = process.env.MOCK_WEBHOOK_SECRET || 'mock_webhook_secret_123';
    this.priceId = process.env.MOCK_PRICE_ID || 'price_mock_pro_monthly';
  }

  async createCustomer(userId, mobile) {
    const customerId = `cust_${crypto.randomBytes(16).toString('hex')}`;
    return {
      id: customerId,
      email: `${mobile}@example.com`,
      metadata: { userId: userId.toString() }
    };
  }

  async createCheckoutSession(userId, customerId) {
    const sessionId = `cs_${crypto.randomBytes(16).toString('hex')}`;
    return {
      id: sessionId,
      mode: 'subscription',
      customer: customerId,
      subscription: `sub_${crypto.randomBytes(16).toString('hex')}`,
      metadata: { userId: userId.toString() },
      url: `https://mock-payment.com/checkout/${sessionId}`,
      status: 'open'
    };
  }

  createWebhookEvent(type, data) {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({ type, data, timestamp });
    const signature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return {
      id: `evt_${crypto.randomBytes(16).toString('hex')}`,
      type,
      data: { object: data },
      timestamp,
      signature
    };
  }

  verifyWebhookSignature(rawBody, signature) {
    const computedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    
    console.log('Computed signature:', computedSignature);
    console.log('Received signature:', signature);
    
    return computedSignature === signature;
  }

  generateTestSignature(payload) {
    return crypto
      .createHmac('sha256', this.webhookSecret)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');
  }
}

module.exports = new MockPayment();