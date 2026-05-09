import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import { createClient } from "@/utils/supabase/server"

export async function POST(req: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await req.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Dados de subscription inválidos" }, { status: 400 })
    }

    // Apaga todos os endereços antigos do usuário antes de salvar o novo.
    // Isso evita acúmulo de subscriptions duplicadas ao ativar/desativar o toggle.
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .neq("endpoint", endpoint) // mantém só se for exatamente o mesmo endpoint

    // Upsert — se já existe o endpoint, atualiza. Se não, cria.
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        { onConflict: "endpoint" }
      )

    if (error) {
      console.error("Erro ao salvar subscription:", error)
      return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
