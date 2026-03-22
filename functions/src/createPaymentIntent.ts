import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const createPaymentIntent = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'authorization, content-type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  try {
    // Verify Firebase ID token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized');
    const decoded = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
    const uid = decoded.uid; 

    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) throw new Error('Server misconfiguration: missing publishable key');

    // Find or create Stripe customer
    const existingCustomers = await stripe.customers.search({
      query: `metadata['firebase_uid']:'${uid}'`,
      limit: 1,
    });

    let customer;
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: decoded.email,
        metadata: { firebase_uid: uid },
      });
    }

    // Ephemeral key for PaymentSheet
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2023-10-16' }
    );

    // PaymentIntent for $9.99 premium upgrade
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 999,
      currency: 'usd',
      customer: customer.id,
      metadata: { firebase_uid: uid },
      automatic_payment_methods: { enabled: true },
    });

    if (!paymentIntent.client_secret) throw new Error('Failed to create payment intent');

    res.json({
      clientSecret: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customerId: customer.id,
      publishableKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: message });
  }
});
