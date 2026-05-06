import { NextRequest, NextResponse } from "next/server"
import webpush, { PushSubscription } from "web-push"
import { createClient } from "@/utils/supabase/server"

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

function getNthBusinessDay(year: number, month: number, nth: number): number {
  let count = 0
  let day = 1
  const max = new Date(year, month + 1, 0).getDate()
  while (day <= max) {
    const d = new Date(year, month, day).getDay()
    if (d !== 0 && d !== 6) count++
    if (count === nth) return day
    day++
  }
  let last = max
  while (true) {
    const d = new Date(year, month, last).getDay()
    if (d !== 0 && d !== 6) return last
    last--
  }
}

export async function GET(req: NextRequest) {
  // Protege a rota — só o cron da Vercel (com o secret) pode chamar
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const supabase = await createClient()

  // Busca todas as subscriptions com o user_id
  const { data: subscriptions, error: subError } = await supabase
    .from("push_subscriptions")
    .select("*")

  if (subError || !subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, message: "Nenhuma subscription ativa" })
  }

  // Busca todas as transações recorrentes de todos os usuários
  const { data: recurring, error: recError } = await supabase
    .from("recurring_transactions")
    .select("*")

  if (recError || !recurring) {
    return NextResponse.json({ error: "Erro ao buscar recorrentes" }, { status: 500 })
  }

  const now = new Date()
  // Horário de Brasília (UTC-3)
  const brOffset = -3 * 60
  const localNow = new Date(now.getTime() + (brOffset - now.getTimezoneOffset()) * 60000)
  const today = localNow.getDate()
  const todayMonth = localNow.getMonth()
  const todayYear = localNow.getFullYear()

  // Calcula o dia de amanhã
  const tomorrowDate = new Date(localNow)
  tomorrowDate.setDate(today + 1)
  const tomorrow = tomorrowDate.getDate()
  const tomorrowMonth = tomorrowDate.getMonth()
  const tomorrowYear = tomorrowDate.getFullYear()

  // Agrupa recorrentes por user_id
  const recurringByUser = recurring.reduce<Record<string, typeof recurring>>((acc, r) => {
    if (!acc[r.user_id]) acc[r.user_id] = []
    acc[r.user_id].push(r)
    return acc
  }, {})

  let totalSent = 0
  const failedEndpoints: string[] = []

  for (const sub of subscriptions) {
    const userRecurring = recurringByUser[sub.user_id] ?? []

    // Filtra contas que vencem hoje ou amanhã
    const todayItems: typeof recurring = []
    const tomorrowItems: typeof recurring = []

    for (const rec of userRecurring) {
      const getDay = (year: number, month: number) =>
        rec.is_business_day
          ? getNthBusinessDay(year, month, rec.day_of_month)
          : Math.min(rec.day_of_month, new Date(year, month + 1, 0).getDate())

      if (getDay(todayYear, todayMonth) === today) todayItems.push(rec)
      if (getDay(tomorrowYear, tomorrowMonth) === tomorrow) tomorrowItems.push(rec)
    }

    if (todayItems.length === 0 && tomorrowItems.length === 0) continue

    // Monta notificação
    let title = "Prisma 💰"
    let body = ""

    if (todayItems.length > 0 && tomorrowItems.length > 0) {
      body = `${todayItems.length} conta(s) vencem hoje e ${tomorrowItems.length} vencem amanhã`
    } else if (todayItems.length === 1) {
      const item = todayItems[0]
      const emoji = item.type === "expense" ? "🔴" : "🟢"
      body = `${emoji} ${item.description} vence hoje • R$ ${Number(item.amount).toFixed(2)}`
    } else if (todayItems.length > 1) {
      const total = todayItems.reduce((s, i) => s + Number(i.amount), 0)
      body = `${todayItems.length} contas vencem hoje • Total: R$ ${total.toFixed(2)}`
    } else if (tomorrowItems.length === 1) {
      const item = tomorrowItems[0]
      const emoji = item.type === "expense" ? "🔴" : "🟢"
      body = `${emoji} ${item.description} vence amanhã • R$ ${Number(item.amount).toFixed(2)}`
    } else {
      body = `${tomorrowItems.length} contas vencem amanhã`
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      url: "/dashboard",
    })

    const pushSub: PushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    }

    try {
      await webpush.sendNotification(pushSub, payload)
      totalSent++
    } catch (err: any) {
      console.error(`Erro ao enviar para ${sub.endpoint}:`, err.message)
      // Se subscription expirou (410), remove do banco
      if (err.statusCode === 410 || err.statusCode === 404) {
        failedEndpoints.push(sub.endpoint)
      }
    }
  }

  // Remove subscriptions inválidas
  if (failedEndpoints.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", failedEndpoints)
  }

  return NextResponse.json({
    success: true,
    sent: totalSent,
    removed: failedEndpoints.length,
  })
}
