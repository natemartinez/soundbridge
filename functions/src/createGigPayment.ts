import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const createGigPayment = functions.https.onRequest(async (req, res) => {
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

    // Parse and validate gig payment body
    const { gig_id, amount_cents } = req.body;
    if (!gig_id || typeof gig_id !== 'string') {
      throw new Error('Missing or invalid gig_id');
    }
    if (!Number.isInteger(amount_cents) || amount_cents < 100 || amount_cents > 100000) {
      throw new Error('Invalid amount: must be between $1.00 and $1,000.00');
    }

    const gigDoc = await admin.firestore().collection('gigs').doc(gig_id).get();
    if (!gigDoc.exists) throw new Error('Gig not found');
    const expectedCents = Math.round(gigDoc.data()!.pay_offered * 100);
    if (Math.abs(amount_cents - expectedCents) > 1) {
      throw new Error('Amount mismatch: payment rejected');
    }

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

    // PaymentIntent with dynamic gig amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: 'usd',
      customer: customer.id,
      metadata: {
        firebase_uid: uid,
        gig_id,
        payment_type: 'gig_payment',
      },
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
