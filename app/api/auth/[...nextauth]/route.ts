import NextAuth, { AuthOptions } from "next-auth";
import { authOptions } from "@/lib/auth";

export const GET = NextAuth(authOptions);
export const POST = GET;
