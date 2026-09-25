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
          const user = await prisma.profile.findUnique({ where: { email: loginId } })
          if (!user || !user.password || !user.isActive) return null
          
          const passwordsMatch = await bcrypt.compare(password, user.password)
          if (passwordsMatch) {
            
            if (user.role === 'SALESMAN') {
              const now = getCurrentKolkataTime();
              const timeDetails = getKolkataTimeDetails(now);
              
              // TEMPORARILY DISABLED: 7 AM to 7 PM login restriction
              // if (timeDetails.hour < 7 || timeDetails.hour >= 19) {
              //   throw new Error("Salesman login is available only between 7:00 AM and 7:00 PM. Please try again tomorrow after 7:00 AM.");
              // }
              
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
