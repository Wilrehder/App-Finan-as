import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    publicKey: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || process.env.MERCADOPAGO_PUBLIC_KEY || ""
  })
}
