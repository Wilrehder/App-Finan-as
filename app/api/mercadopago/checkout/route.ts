import { NextResponse } from "next/server"
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { createClient } from "@/utils/supabase/server"

// Initialize Mercado Pago
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '', 
  options: { timeout: 5000 } 
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const preApproval = new PreApproval(client)

    // Mercado Pago PreApproval (Subscription) API requires an email
    const userEmail = user.email || 'contato@finchat.app'

    const body = {
      reason: 'Assinatura Anual Finchat',
      external_reference: user.id, // We use this to identify the user in the Webhook
      payer_email: userEmail,
      auto_recurring: {
        frequency: 12, // Every 12
        frequency_type: 'months', // Months = Yearly
        transaction_amount: 69.90, // R$ 69,90
        currency_id: 'BRL',
      },
      back_url: `${process.env.NEXT_PUBLIC_APP_URL}/chat`,
      status: 'pending'
    }

    const response = await preApproval.create({ body })

    // Redirect the user to the Mercado Pago checkout URL
    return NextResponse.json({ init_point: response.init_point })

  } catch (error: any) {
    console.error("Mercado Pago Checkout Error:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
