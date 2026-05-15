"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/utils/supabase/server"

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message))
  }

  revalidatePath("/", "layout")
  // Middleware redireciona para /chat se já tiver subscription_status active
  redirect("/assinatura")
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: {
        name: formData.get("name") as string,
      }
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect("/cadastro?error=" + encodeURIComponent(error.message))
  }

  revalidatePath("/", "layout")
  // Redireciona para verificação OTP
  redirect("/cadastro/verificar?email=" + encodeURIComponent(data.email))
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const headersList = await headers()
  const host = headersList.get("host")
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
  const origin = `${protocol}://${host}`

  const { data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (data.url) {
    redirect(data.url)
  }
}

export async function verifyOtp(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get("email") as string
  const token = formData.get("code") as string

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  })

  if (error) {
    redirect(
      `/cadastro/verificar?email=${encodeURIComponent(
        email
      )}&error=${encodeURIComponent("Código inválido ou expirado. Tente novamente.")}`
    )
  }

  revalidatePath("/", "layout")
  redirect("/assinatura")
}

export async function resendOtp(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get("email") as string

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  })

  if (error) {
    redirect(
      `/cadastro/verificar?email=${encodeURIComponent(
        email
      )}&error=${encodeURIComponent(error.message)}`
    )
  }

  redirect(
    `/cadastro/verificar?email=${encodeURIComponent(
      email
    )}&message=${encodeURIComponent("Código reenviado com sucesso!")}`
  )
}

