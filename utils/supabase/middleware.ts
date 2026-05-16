import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage = (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/cadastro')) && !request.nextUrl.pathname.startsWith('/cadastro/verificar')
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/chat') || request.nextUrl.pathname.startsWith('/configuracoes') || request.nextUrl.pathname.startsWith('/calendario') || request.nextUrl.pathname.startsWith('/objetivos')
  const isAssinaturaPage = request.nextUrl.pathname.startsWith('/assinatura')

  if (
    !user &&
    (isProtectedRoute || isAssinaturaPage)
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  let hasAccess = false
  if (user) {
    const status = user.user_metadata?.subscription_status
    hasAccess = status === 'active' || status === 'trial'
    
    if (status === 'cancelled') {
      const trialExpires = user.user_metadata?.trial_expires_at
      const subExpires = user.user_metadata?.subscription_expires_at
      
      if (trialExpires && new Date(trialExpires) > new Date()) {
        hasAccess = true
      }
      if (subExpires && new Date(subExpires) > new Date()) {
        hasAccess = true
      }
    }
  }

  if (user && isProtectedRoute && !hasAccess) {
    const url = request.nextUrl.clone()
    url.pathname = '/assinatura'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = hasAccess ? '/chat' : '/assinatura'
    return NextResponse.redirect(url)
  }

  if (user && isAssinaturaPage) {
    const status = user.user_metadata?.subscription_status
    if (status === 'active' || status === 'trial') {
      const url = request.nextUrl.clone()
      url.pathname = '/chat'
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
