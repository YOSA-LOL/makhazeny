import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { verifyToken } from '@/lib/auth'

const PUBLIC_PATHS = ['/login']
const PUBLIC_API_PREFIXES = ['/api/auth/']

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isProtectedApi(pathname: string) {
  return pathname.startsWith('/api/') && !isPublicPath(pathname)
}

function isProtectedPage(pathname: string) {
  return !pathname.startsWith('/_next') && !pathname.startsWith('/api') && !isPublicPath(pathname)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth_token')?.value
  const user = token ? verifyToken(token) : null

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/products', request.url))
  }

  if (user) {
    return NextResponse.next()
  }

  if (isProtectedApi(pathname)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (isProtectedPage(pathname)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
