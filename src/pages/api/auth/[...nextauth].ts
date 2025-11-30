import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "../../../server/db";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";

// 扩展 Session 类型以包含 onboarding 状态
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      hasCompletedOnboarding?: boolean;
    };
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    hasCompletedOnboarding?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    hasCompletedOnboarding?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "邮箱登录",
      credentials: {
        email: { label: "邮箱", type: "email", placeholder: "example@email.com" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email }
        });

        if (user && user.password) {
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
          if (isPasswordValid) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              hasCompletedOnboarding: user.hasCompletedOnboarding,
            };
          }
        }

        return null;
      }
    })
  ],
  callbacks: {
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id;
        session.user.hasCompletedOnboarding = token.hasCompletedOnboarding;
      }
      return session;
    },
    jwt: async ({ token, user, account }) => {
      if (user) {
        token.id = user.id;
        token.hasCompletedOnboarding = user.hasCompletedOnboarding;
      }
      return token;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Cookie 配置：NextAuth 在生产环境会自动添加 __Secure- 前缀
  // 这里显式配置确保 Cookie 在 Vercel 上正确工作
  useSecureCookies: process.env.NODE_ENV === 'production',
  pages: {
    signIn: '/auth/signin',
  },
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);