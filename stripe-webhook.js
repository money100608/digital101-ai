// ============================================================
// Digital101 AI — Stripe Webhook Handler
// File: /api/stripe-webhook.js
// ============================================================

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Digital101 AI Webhook] Event: ${event.type}`);

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object;
        const customerEmail = session.customer_email || session.customer_details?.email;
        const planId = session.metadata?.plan_id || "starter";
        console.log(`✅ New subscription: ${customerEmail} | Plan: ${planId}`);
        // Update Supabase user plan and send Welcome email here
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        console.log(`💰 Payment received: ${invoice.customer_email} | $${invoice.amount_paid / 100}`);
        // Reset monthly usage counter in Supabase
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        console.log(`❌ Subscription cancelled: ${subscription.customer}`);
        // Downgrade user to free plan
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object;
        console.log(`⚠️ Trial ending soon: ${subscription.customer}`);
        // Send "Your Digital101 AI trial ends tomorrow" email
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.log(`⛔ Payment failed: ${invoice.customer_email}`);
        // Send payment failed email
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error("Webhook handler error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
