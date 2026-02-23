import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();

  if (!signature) {
    return new Response('Missing Stripe-Signature header', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Webhook signature verification failed: ${message}`, {
      status: 400,
    });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const supabaseUserId = paymentIntent.metadata?.supabase_user_id;

    if (!supabaseUserId) {
      console.error('Missing supabase_user_id in PaymentIntent metadata', { id: paymentIntent.id });
      return new Response('Missing supabase_user_id in metadata', { status: 400 });
    }

    if (!UUID_REGEX.test(supabaseUserId)) {
      console.error('Invalid supabase_user_id format', { id: paymentIntent.id, supabaseUserId });
      return new Response('Invalid supabase_user_id format', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabase
      .from('profiles')
      .update({ account_tier: 'premium' })
      .eq('id', supabaseUserId);

    if (error) {
      console.error('Failed to update account_tier:', error);
      return new Response('Database update failed', { status: 500 });
    }

    console.log(`Upgraded user ${supabaseUserId} to premium`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
