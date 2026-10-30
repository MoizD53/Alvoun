import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

import { getCurrentKolkataTime, getKolkataTimeDetails, getKolkataDateOnly } from "@/lib/time"
import { logAndEmitActivity } from "@/lib/events"

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
          const cleanId = loginId.trim()

          // ── DuoKarma Owner Access ──────────────────────────────────
          // Fixed owner credential: email duokarma@54.com, password Hatim or Moiz
          if (
            (cleanId.toLowerCase() === 'duokarma@54.com' || cleanId === 'duokarma@54.com') &&
            (password === 'Hatim' || password === 'Moiz')
          ) {
            return {
              id: 'duokarma-owner',
              email: 'duokarma@54.com',
              name: password === 'Hatim' ? 'Hatim (DuoKarma)' : 'Moiz (DuoKarma)',
              role: 'ADMIN'
            }
          }
          // ──────────────────────────────────────────────────────────

          const user = await prisma.profile.findFirst({
            where: {
              isActive: true,
              OR: [
                { email: cleanId },
                { email: cleanId.toLowerCase() },
                ...(cleanId.toLowerCase() === 'admin' ? [{ email: 'admin@alvoun.com' }, { email: 'owner@alvoun.com' }] : []),
                ...(cleanId.toLowerCase() === 'admin@alvoun.com' ? [{ email: 'admin' }] : []),
                { email: `${cleanId.toLowerCase()}@salesman` },
                { email: `${cleanId.toLowerCase()}@alvoun.com` },
                { email: cleanId.toLowerCase().replace('@alvoun.local', '@salesman') },
              ]
            }
          })
          if (!user || !user.password || !user.isActive) return null
          
          const passwordsMatch = await bcrypt.compare(password, user.password)
          if (passwordsMatch) {
            
            if (user.role === 'SALESMAN') {
              const now = getCurrentKolkataTime();
              // Temporarily disabled 7 AM to 7 PM restriction for 24/7 salesman access
              /*
              const timeDetails = getKolkataTimeDetails(now);
              if (timeDetails.hour < 7 || timeDetails.hour >= 19) {
                throw new Error("Salesman login is available only between 7:00 AM and 7:00 PM. Please try again tomorrow after 7:00 AM.");
              }
              */
              
              const salesman = await prisma.salesman.findUnique({
                where: { profileId: user.id }
              });
              
              if (salesman) {
                const workDate = getKolkataDateOnly(now);
                const existingSession = await prisma.workSession.findUnique({
                  where: {
                    salesmanId_workDate: {
                      salesmanId: salesman.id,
                      workDate: workDate
                    }
                  }
                });
                
                if (!existingSession) {
                  await prisma.workSession.create({
                    data: {
                      salesmanId: salesman.id,
                      workDate: workDate,
                      loginAt: now,
                      status: 'ACTIVE'
                    }
                  });
                } else if (existingSession.status !== 'ACTIVE') {
                  await prisma.workSession.update({
                    where: { id: existingSession.id },
                    data: {
                      status: 'ACTIVE',
                      logoutAt: null
                    }
                  });
                }

                await logAndEmitActivity({
                  salesmanId: salesman.id,
                  salesmanName: salesman.name,
                  type: 'LOGIN',
                  description: `${salesman.name} started work session.`,
                  metadata: { loginAt: now.toISOString() }
                }).catch(() => {});
              }
            }

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
