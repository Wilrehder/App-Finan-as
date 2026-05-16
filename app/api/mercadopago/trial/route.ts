import { NextResponse } from "next/server"
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  options: { timeout: 10000 },
})



export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { card_token, plan_type } = await req.json()

    if (!card_token || !plan_type) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    // Plano mensal: R$ 7,11/mês. Plano anual: R$ 69,90 a cada 12 meses.
    const isMonthly = plan_type === "monthly"
    const preApprovalClient = new PreApproval(mpClient)

    const preapprovalBody = {
      reason: isMonthly ? "Finchat Mensal" : "Finchat Anual",
      external_reference: user.id,
      payer_email: user.email || "contato@finchat.app",
      card_token_id: card_token,
      auto_recurring: {
        frequency: isMonthly ? 1 : 12,
        frequency_type: "months" as const,
        transaction_amount: isMonthly ? 7.11 : 69.90,
        currency_id: "BRL",
        free_trial: {
          frequency: 3,
          frequency_type: "days" as const,
        },
      },
      back_url: `${process.env.NEXT_PUBLIC_APP_URL}/chat`,
      status: "authorized" as const,
    }

    const subscription = await preApprovalClient.create({ body: preapprovalBody })

    // Gravar trial no user_metadata do Supabase
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        subscription_status: "trial",
        trial_start_at: new Date().toISOString(),
        trial_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        mp_subscription_id: subscription.id,
        plan_type,
      },
    })

    if (updateError) {
      console.error("Erro ao atualizar metadata do usuário:", updateError)
    }

    console.log(`Trial criado para usuário ${user.id} — subscription: ${subscription.id}`)
    return NextResponse.json({ success: true, subscription_id: subscription.id })

  } catch (error: any) {
    console.error("Erro ao criar trial:", error)
    return NextResponse.json(
      { error: error.message || "Falha ao criar assinatura de teste" },
      { status: 500 }
    )
  }
}
