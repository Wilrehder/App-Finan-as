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

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const mpSubscriptionId = user.user_metadata?.mp_subscription_id
    
    if (!mpSubscriptionId) {
      return NextResponse.json({ error: "Nenhuma assinatura ativa encontrada" }, { status: 400 })
    }

    // Cancela no Mercado Pago
    const preApprovalClient = new PreApproval(mpClient)
    await preApprovalClient.update({
      id: mpSubscriptionId,
      body: {
        status: "cancelled"
      }
    })

    // Atualiza metadata no Supabase
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        subscription_status: "cancelled",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Erro ao cancelar assinatura:", error)
    return NextResponse.json(
      { error: "Falha ao cancelar assinatura" },
      { status: 500 }
    )
  }
}
