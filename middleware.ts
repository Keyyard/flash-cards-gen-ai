import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware() {
    // Add custom middleware logic here if needed
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Skip auth in development mode unless FORCE_AUTH is set
        if (process.env.NODE_ENV === 'development' && !process.env.FORCE_AUTH) {
          return true
        }
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth).*)'],
}