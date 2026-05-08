import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import webpush, { PushSubscription } from "web-push";
import { createClient } from "@supabase/supabase-js";

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { reminderId, userId, type } = body;

    if (!reminderId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get the reminder
    const { data: reminder, error: remError } = await supabase
      .from("reminders")
      .select("*")
      .eq("id", reminderId)
      .single();

    if (remError || !reminder) {
      // Se foi apagado no DB, retorna 200 pro QStash não ficar tentando de novo.
      return NextResponse.json({ success: true, ignored: true });
    }

    // Se o lembrete foi inativado ou excluído, ignoramos silenciosamente
    if (reminder.is_active === false) {
      return NextResponse.json({ success: true, ignored: true });
    }

    // 2. Get user subscriptions
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ error: "No subscriptions found" }, { status: 404 });
    }

    // 3. Configure web-push
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    const payload = JSON.stringify({
      title: "Lembrete 🔔",
      body: reminder.title,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      url: "/notificacoes",
    });

    let sent = 0;
    const failedEndpoints: string[] = [];

    // 4. Send pushes
    for (const sub of subscriptions) {
      const pushSub: PushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(pushSub, payload);
        sent++;
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          failedEndpoints.push(sub.endpoint);
        }
      }
    }

    // 5. Cleanup failed subscriptions
    if (failedEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", failedEndpoints);
    }

    // 6. Atualizar reminder e salvar no painel de notificacoes
    const now = new Date();
    const isoDate = now.toISOString().split("T")[0];
    
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Lembrete 🔔",
      body: reminder.title,
      type: "CUSTOM_REMINDER",
      url: "/notificacoes",
      status: "unread",
    });

    await supabase
      .from("reminders")
      .update({ last_sent_at: isoDate })
      .eq("id", reminderId);

    // Se for um lembrete único, podemos opcionalmente deletá-lo ou inativá-lo
    // Mas por enquanto apenas atualizamos o last_sent_at.

    return NextResponse.json({ success: true, sent });
  } catch (error: any) {
    console.error("QStash Handler Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// verifySignatureAppRouter protege a rota para garantir que apenas o Upstash possa chamá-la
export const POST = verifySignatureAppRouter(handler, {
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "dummy_build_key",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "dummy_build_key",
});
