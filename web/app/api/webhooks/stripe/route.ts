import { NextRequest, NextResponse } from "next/server";
import { stripe, PAYMENTS_ENABLED } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  if (!PAYMENTS_ENABLED) {
    return NextResponse.json({ message: "Payments disabled" }, { status: 200 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const sparId = paymentIntent.metadata?.spar_id;
        const role = paymentIntent.metadata?.role; // "creator" or "opponent"

        if (sparId && role) {
          const updateField = role === "creator" ? "creator_paid" : "opponent_paid";
          await supabase
            .from("spars")
            .update({ [updateField]: true })
            .eq("id", sparId);

          console.log(`[Stripe] Payment succeeded for spar ${sparId} (${role})`);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        console.log(`[Stripe] Payment failed: ${paymentIntent.id}`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Stripe] Webhook error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
