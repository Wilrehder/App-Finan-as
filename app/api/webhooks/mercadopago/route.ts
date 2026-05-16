import { NextResponse } from "next/server"
import { MercadoPagoConfig, PreApproval, Payment } from 'mercadopago'
import { createClient } from "@supabase/supabase-js"

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '', 
  options: { timeout: 5000 } 
})

// Initialize Supabase Admin client using Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("Mercado Pago Webhook Received:", JSON.stringify(body))

    const type = body.type || body.topic
    const dataId = body.data?.id

    if (!dataId) {
      return NextResponse.json({ success: true }) // Ignore pings
    }

    // ─── Assinatura (Preapproval) ─────────────────────────────────────────────
    if (type === 'subscription_preapproval') {
      const preApproval = new PreApproval(client)
      const subscription = await preApproval.get({ id: dataId })
      const userId = subscription.external_reference

      if (!userId) return NextResponse.json({ success: true })

      if (subscription.status === 'authorized') {
        // Assinatura criada (início do trial ou assinatura ativa)
        // Só atualiza se ainda não estava active (não queremos rebaixar de active para trial)
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId)
        const currentStatus = user?.user_metadata?.subscription_status
        
        if (currentStatus !== 'active') {
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { subscription_status: 'trial' },
          })
          console.log(`Usuário ${userId} → status: trial (assinatura autorizada)`)
        }
      } else if (subscription.status === 'cancelled') {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { subscription_status: 'cancelled' },
        })
        console.log(`Usuário ${userId} → status: cancelled`)
      } else if (subscription.status === 'paused') {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { subscription_status: 'paused' },
        })
        console.log(`Usuário ${userId} → status: paused`)
      }
    }

    // ─── Pagamento (cobrança do plano após trial ou pagamento avulso) ─────────
    else if (type === 'payment') {
      const paymentClient = new Payment(client)
      const payment = await paymentClient.get({ id: dataId })
      const userId = payment.external_reference

      if (!userId) return NextResponse.json({ success: true })

      if (payment.status === 'approved') {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId)
        const currentPlanType = user?.user_metadata?.plan_type || 'yearly'

        // Calcula a expiração baseada no tipo de plano
        const daysToAdd = currentPlanType === 'monthly' ? 31 : 365
        const subscriptionExpiresAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString()

        // Pagamento aprovado → assinatura ativa (trial terminou e cobrou, ou pagamento à vista)
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { 
            subscription_status: 'active',
            plan_type: currentPlanType,
            subscription_expires_at: subscriptionExpiresAt
          },
        })
        console.log(`Usuário ${userId} → status: active (pagamento aprovado: R$ ${payment.transaction_amount}) - Expira em: ${subscriptionExpiresAt}`)
      } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
        console.log(`Pagamento ${dataId} rejeitado/cancelado para usuário ${userId}`)
        // Não altera o status — deixa o próprio MP tentar novamente (retry automático)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Mercado Pago Webhook Error:", error)
    // Sempre retorna 200 para MP não ficar reprocessando em loop
    return NextResponse.json({ success: false, error: error.message }, { status: 200 })
  }
}

