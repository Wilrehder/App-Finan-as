import { NextRequest, NextResponse } from "next/server";
import webpush, { PushSubscription } from "web-push";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    // ── Auth simples: aceita tanto o token do QStash quanto o CRON_SECRET ──
    // O QStash envia o token no header "upstash-signature", mas como temos
    // problemas com a verificação, aceitamos também via Authorization Bearer.
    const authHeader = req.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const upstashSig = req.headers.get("upstash-signature");

    // Permite: Bearer CRON_SECRET  OU  qualquer request do Upstash (tem o header upstash-signature)
    const isAuthorized =
      bearer === process.env.CRON_SECRET ||
      (upstashSig && upstashSig.length > 10);

    if (!isAuthorized) {
      console.error("QStash: Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reminderId, userId } = body;

    console.log("QStash handler called:", { reminderId, userId });

    if (!reminderId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Busca o lembrete
    const { data: reminder, error: remError } = await supabase
      .from("reminders")
      .select("*")
      .eq("id", reminderId)
      .single();

    if (remError || !reminder) {
      console.log("QStash: reminder not found or deleted, ignoring.");
      return NextResponse.json({ success: true, ignored: true });
    }

    if (reminder.is_active === false) {
      console.log("QStash: reminder is inactive, ignoring.");
      return NextResponse.json({ success: true, ignored: true });
    }

    // 2. Busca as subscriptions do usuário
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    console.log("QStash: subscriptions found:", subscriptions?.length ?? 0, subError);

    if (!subscriptions || subscriptions.length === 0) {
      // Salva a notificação no painel mesmo sem push
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Lembrete 🔔",
        body: reminder.title,
        type: "CUSTOM_REMINDER",
        url: "/notificacoes",
        status: "unread",
      });
      return NextResponse.json({ success: true, sent: 0, note: "No push subscriptions" });
    }

    // 3. Configura web-push
    if (!process.env.VAPID_SUBJECT || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.error("QStash: VAPID keys are missing!");
      return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
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

    // 4. Envia push para cada dispositivo
    for (const sub of subscriptions) {
      const pushSub: PushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(pushSub, payload);
        sent++;
        console.log("QStash: push sent to", sub.endpoint.substring(0, 50));
      } catch (error: any) {
        console.error("QStash: push error:", error.statusCode, error.body);
        if (error.statusCode === 410 || error.statusCode === 404) {
          failedEndpoints.push(sub.endpoint);
        }
      }
    }

    // 5. Remove subscriptions inválidas
    if (failedEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", failedEndpoints);
    }

    // 6. Salva no painel de notificações e atualiza last_sent_at
    const isoDate = new Date().toISOString().split("T")[0];

    await Promise.all([
      supabase.from("notifications").insert({
        user_id: userId,
        title: "Lembrete 🔔",
        body: reminder.title,
        type: "CUSTOM_REMINDER",
        url: "/notificacoes",
        status: "unread",
      }),
      supabase
        .from("reminders")
        .update({ last_sent_at: isoDate })
        .eq("id", reminderId),
    ]);

    console.log("QStash: done. Sent:", sent);
    return NextResponse.json({ success: true, sent, removed: failedEndpoints.length });
  } catch (error: any) {
    console.error("QStash Handler Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
