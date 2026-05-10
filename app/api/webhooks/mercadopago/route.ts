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
    console.log("Mercado Pago Webhook Received:", body)

    const type = body.type || body.topic
    const dataId = body.data?.id

    if (!dataId) {
      return NextResponse.json({ success: true }) // Ignore pings
    }

    let userIdToActivate = null
    let isActive = false

    if (type === 'subscription_preapproval') {
      const preApproval = new PreApproval(client)
      const subscription = await preApproval.get({ id: dataId })
      
      if (subscription.status === 'authorized') {
        userIdToActivate = subscription.external_reference
        isActive = true
      }
    } else if (type === 'payment') {
      // Sometimes we just get the payment webhook
      const paymentClient = new Payment(client)
      const payment = await paymentClient.get({ id: dataId })
      
      if (payment.status === 'approved' && payment.external_reference) {
        userIdToActivate = payment.external_reference
        isActive = true
      }
    }

    if (userIdToActivate && isActive) {
      console.log(`Activating user ${userIdToActivate}...`)
      
      // Update the user's metadata in Supabase Auth
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userIdToActivate,
        { user_metadata: { subscription_status: 'active' } }
      )

      if (error) {
        console.error("Failed to update user status in Supabase:", error)
        throw error
      }
      
      console.log(`User ${userIdToActivate} successfully activated!`)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Mercado Pago Webhook Error:", error)
    // Always return 200 to MP so they stop retrying if it's a code error we can't fix immediately
    return NextResponse.json({ success: false, error: error.message }, { status: 200 })
  }
}
