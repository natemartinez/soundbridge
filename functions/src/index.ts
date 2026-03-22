import * as admin from 'firebase-admin';

admin.initializeApp();

export { createPaymentIntent } from './createPaymentIntent';
export { createGigPayment } from './createGigPayment';
export { stripeWebhook } from './stripeWebhook';
