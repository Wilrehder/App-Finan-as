import { NextRequest, NextResponse } from "next/server";
import webpush, { PushSubscription } from "web-push";
import { createClient } from "@/utils/supabase/server";

// Rota de diagnóstico: dispara um push REAL do servidor para o usuário logado.
// Chame com: GET /api/push/test
export async function GET(req: NextRequest) {
  try {
    // Verifica se VAPID está configurado
    if (!process.env.VAPID_SUBJECT || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json({
        error: "VAPID keys não configuradas no servidor",
        has_subject: !!process.env.VAPID_SUBJECT,
        has_public: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        has_private: !!process.env.VAPID_PRIVATE_KEY,
      }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Busca subscriptions do usuário
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user.id);

    if (subError) {
      return NextResponse.json({ error: "Erro ao buscar subscriptions: " + subError.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        error: "Nenhuma subscription encontrada para este usuário",
        userId: user.id,
        hint: "Vá em Ajustes e ative as notificações (toggle) para criar a subscription",
      }, { status: 404 });
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const payload = JSON.stringify({
      title: "✅ Teste do Servidor",
      body: "Push funcionando! Notificações estão configuradas corretamente.",
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
        results.push({ endpoint: sub.endpoint.substring(0, 60) + "...", status: "sent" });
      } catch (error: any) {
        results.push({
          endpoint: sub.endpoint.substring(0, 60) + "...",
          status: "error",
          code: error.statusCode,
          body: error.body,
        });
      }
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      subscriptions_found: subscriptions.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
