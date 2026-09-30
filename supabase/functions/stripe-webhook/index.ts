import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Webhook secret not configured or signature missing", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    console.log(`Event received: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_details?.email || session.customer_email;
      const customerId = session.customer as string;

      if (!email) throw new Error("No email found in session");

      // 1. Supabase Authにユーザーが存在するか確認、なければ作成
      let { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      let user = users?.users.find((u) => u.email === email);

      if (!user) {
        const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          email_confirm: true, // OTPでログインさせるのでtrueにしておく
        });
        if (createError) throw createError;
        user = authData.user;
      }

      // 2. Stripeのサブスクリプション情報を取得
      const subscriptionId = session.subscription as string;
      let currentPeriodEnd = new Date();
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        currentPeriodEnd = new Date(sub.current_period_end * 1000);
      } else {
        // 買い切りの場合の予備処理（念のため1年有効など）
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
      }

      // プランに応じてデバイス上限を決定（メタデータやデフォルト値）
      const planType = session.metadata?.plan_type || "clinic_plan";
      const maxDevices = planType === "personal" ? 3 : 1;

      // 3. user_subscriptions を Upsert
      const { error: upsertError } = await supabaseAdmin.from("user_subscriptions").upsert({
        user_id: user.id,
        email: email,
        stripe_customer_id: customerId,
        status: "active",
        max_devices: maxDevices,
        plan_type: planType,
        current_period_end: currentPeriodEnd.toISOString(),
      });

      if (upsertError) throw upsertError;
      console.log(`Successfully activated subscription for ${email}`);
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const status = subscription.status; // 'active', 'past_due', 'canceled', etc.
      
      const { error } = await supabaseAdmin
        .from("user_subscriptions")
        .update({ 
          status: status === "active" ? "active" : "inactive",
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
        })
        .eq("stripe_customer_id", customerId);
        
      if (error) throw error;
      console.log(`Subscription updated for customer ${customerId}: ${status}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    const error = err as Error;
    console.error(`Error processing webhook: ${error.message}`);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
});
