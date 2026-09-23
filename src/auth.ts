import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        loginId: { label: "Login ID", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ loginId: z.string().min(1), password: z.string().min(1) })
          .safeParse(credentials)

        if (parsedCredentials.success) {
          const { loginId, password } = parsedCredentials.data
          const user = await prisma.profile.findUnique({ where: { email: loginId } })
          if (!user || !user.password || !user.isActive) return null
          
          const passwordsMatch = await bcrypt.compare(password, user.password)
          if (passwordsMatch) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role
            }
          }
        }
        return null
      }
    })
  ],
  session: { strategy: "jwt" }
})
