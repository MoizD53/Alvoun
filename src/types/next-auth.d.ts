import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    role: string
  }
  interface Session {
    user: User & {
      id: string
      role: string
    }
  }
}
