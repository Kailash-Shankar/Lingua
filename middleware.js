import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Get the current user
  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // 2. Protect Teacher Routes
  if (url.pathname.startsWith('/teacher')) {
    if (!user || user.user_metadata?.user_role !== 'teacher') {
      return NextResponse.redirect(new URL('/login?error=Access Denied', request.url))
    }
  }

  // 3. Protect Student Routes
  if (url.pathname.startsWith('/student')) {
    if (!user || user.user_metadata?.user_role !== 'student') {
      return NextResponse.redirect(new URL('/login?error=Access Denied', request.url))
    }
  }

  // 4. Redirect logged-in users away from Login/Signup pages
  if (user && (url.pathname === '/login' || url.pathname === '/signup')) {
    const role = user.user_metadata?.user_role
    return NextResponse.redirect(new URL(role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}