import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) { res.status(400).send('Missing Stripe-Signature header'); return; }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).send(`Webhook signature verification failed: ${message}`);
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const firebaseUid = paymentIntent.metadata?.firebase_uid;
    const paymentType = paymentIntent.metadata?.payment_type;

    if (!firebaseUid) {
      console.error('Missing firebase_uid in PaymentIntent metadata', { id: paymentIntent.id });
      res.status(400).send('Missing firebase_uid in metadata');
      return;
    }

    if (paymentType === 'gig_payment') {
      const gigId = paymentIntent.metadata?.gig_id;
      const paidAt = new Date().toISOString();

      console.log(`Gig payment succeeded: gig=${gigId}, user=${firebaseUid}, amount=${paymentIntent.amount}`);

      const db = admin.firestore();

      // Find the application for this gig + musician and mark it paid
      if (gigId) {
        const appSnap = await db
          .collection('applications')
          .where('gig_id', '==', gigId)
          .where('musician_id', '==', firebaseUid)
          .limit(1)
          .get();

        if (!appSnap.empty) {
          await appSnap.docs[0].ref.update({
            status: 'paid',
            paid_at: paidAt,
            stripe_payment_intent_id: paymentIntent.id,
          });
        }

        // Create an auditable payment record
        await db.collection('payments').add({
          gig_id: gigId,
          musician_id: firebaseUid,
          amount_cents: paymentIntent.amount,
          stripe_payment_intent_id: paymentIntent.id,
          paid_at: paidAt,
        });
      }
    } else {
      // Premium upgrade (default path)
      await admin.firestore().collection('users').doc(firebaseUid).update({
        account_tier: 'premium',
      });
      console.log(`Upgraded user ${firebaseUid} to premium`);
    }
  }

  res.json({ received: true });
});
