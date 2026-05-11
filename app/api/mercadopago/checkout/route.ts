import { NextResponse } from "next/server"
import { MercadoPagoConfig, Preference } from 'mercadopago'
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

    const preference = new Preference(client)

    const userEmail = user.email || 'contato@finchat.app'

    const body = {
      items: [
        {
          id: 'ano_finchat',
          title: 'Acesso Anual Finchat',
          quantity: 1,
          unit_price: 69.90,
          currency_id: 'BRL',
        }
      ],
      payer: {
        email: userEmail,
      },
      external_reference: user.id, // O Webhook usa isso para identificar o usuário
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/chat`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/assinatura`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/chat`,
      },
      auto_return: 'approved' as const,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
    }

    const response = await preference.create({ body })

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
