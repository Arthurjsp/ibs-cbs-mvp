import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { UserRole } from "@prisma/client";
import { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { cache } from "react";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin"
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const users = await prisma.user.findMany({
          where: { email, isActive: true },
          select: {
            id: true,
            email: true,
            name: true,
            tenantId: true,
            role: true,
            passwordHash: true
          },
          take: 2
        });

        if (users.length !== 1) return null;
        const user = users[0];
        if (!user.passwordHash) return null;

        const validPassword = verifyPassword(password, user.passwordHash);
        if (!validPassword) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          tenantId: user.tenantId,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.tenantId = (user as { tenantId?: string }).tenantId;
        token.role = (user as { role?: UserRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) ?? "";
        session.user.tenantId = (token.tenantId as string) ?? "";
        session.user.role = (token.role as UserRole) ?? "ADMIN";
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};

const getCachedSession = cache(() => getServerSession(authOptions));

export function getRequiredSession() {
  return getCachedSession();
}

export async function requireUser() {
  const session = await getRequiredSession();
  if (!session?.user?.id || !session.user.tenantId) {
    redirect("/auth/signin");
  }
  return session.user;
}

export async function requireRoles(allowedRoles: UserRole[]) {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}
