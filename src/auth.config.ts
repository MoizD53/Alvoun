import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // @ts-ignore
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        // @ts-ignore
        session.user.id = token.id as string
        // @ts-ignore
        session.user.role = token.role as string
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
      
      if (isOnDashboard) {
        if (!isLoggedIn) return false // Redirect to login
        
        const role = (auth.user as any).role
        
        // Admin routes protection
        if (nextUrl.pathname.startsWith('/dashboard/admin')) {
          if (role !== 'OWNER' && role !== 'ADMIN') {
            return Response.redirect(new URL('/dashboard', nextUrl))
          }
        }
        
        // Salesman routes protection
        if (nextUrl.pathname.startsWith('/dashboard/salesman')) {
          if (role !== 'SALESMAN') {
            return Response.redirect(new URL('/dashboard', nextUrl))
          }
        }
        
        return true
      } else if (isLoggedIn && nextUrl.pathname === '/login') {
        return Response.redirect(new URL('/dashboard', nextUrl))
      }
      
      return true
    },
  },
  providers: [], // Add providers in auth.ts
} satisfies NextAuthConfig;
