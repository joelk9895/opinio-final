import NextAuth, { type DefaultSession, type User } from "next-auth";
import { getServerSession } from "next-auth/next";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";
import { NextRequest, NextResponse } from "next/server";

// Define NextAuth config object
export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // For demo purposes, allow any email with password "password"
        if (credentials.password !== "password") {
          return null;
        }

        // Check if user exists or create a new one
        const user = await prisma.user.upsert({
          where: { email: credentials.email as string },
          update: {},
          create: {
            email: credentials.email as string,
            name: (credentials.email as string).split("@")[0],
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  events: {
    async createUser({ user }) {
      if (user.id) {
        const defaultCategories = await prisma.category.findMany({
          where: { isDefault: true },
          select: { id: true },
        });

        if (defaultCategories.length > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              userCategories: {
                createMany: {
                  data: defaultCategories.map((cat) => ({
                    categoryId: cat.id,
                  })),
                  skipDuplicates: true, // Avoid errors if somehow a relation already exists
                },
              },
            },
          });
        }
      }
    },
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        token.role = dbUser?.role;
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: DefaultSession & { user: { id: string; role?: string } };
      token: JWT;
    }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string | undefined;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== "production",
};

// Default export NextAuth handler (used in app/api/auth/[...nextauth]/route.ts)
export default NextAuth(authOptions);

// Re-export getServerSession for App Router
export const getAuthSession = () => getServerSession(authOptions);

// Utility function to protect API routes
export async function protectRoute(
  req: NextRequest,
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  const session = await getAuthSession();
  console.log("Session in protectRoute:", session);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return handler(req, session.user);
}
