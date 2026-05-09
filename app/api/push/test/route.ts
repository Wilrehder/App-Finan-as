import { NextRequest, NextResponse } from "next/server";
import webpush, { PushSubscription } from "web-push";
import { createClient } from "@supabase/supabase-js";

// Rota de diagnóstico. Chame com:
// /api/push/test?secret=prisma_cron_2026_secure
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verifica VAPID
  const vapidOk = !!(process.env.VAPID_SUBJECT && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  if (!vapidOk) {
    return NextResponse.json({
      error: "VAPID keys não configuradas",
      has_subject: !!process.env.VAPID_SUBJECT,
      has_public: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      has_private: !!process.env.VAPID_PRIVATE_KEY,
    }, { status: 500 });
  }

  // Usa service role para buscar TODAS as subscriptions
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subscriptions, error: subError } = await supabase
    .from("push_subscriptions")
    .select("*");

  if (subError) {
    return NextResponse.json({ error: "Erro DB: " + subError.message }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({
      error: "Nenhuma subscription no banco",
      hint: "Vá em Ajustes > desliga e liga as Notificações para criar a subscription",
    }, { status: 404 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const payload = JSON.stringify({
    title: "✅ Teste do Servidor",
    body: "Push funcionando! Notificações OK 🎉",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    url: "/notificacoes",
  });

  const results: any[] = [];

  for (const sub of subscriptions) {
    const pushSub: PushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    try {
      await webpush.sendNotification(pushSub, payload);
      results.push({ userId: sub.user_id, status: "sent ✅" });
    } catch (error: any) {
      results.push({
        userId: sub.user_id,
        status: "error ❌",
        code: error.statusCode,
        body: error.body,
      });
    }
  }

  return NextResponse.json({
    vapid_ok: true,
    subscriptions_found: subscriptions.length,
    results,
  });
}
