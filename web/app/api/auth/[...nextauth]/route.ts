import NextAuth, { NextAuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import { supabase } from "@/lib/supabase"

export const authOptions: NextAuthOptions = {
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID ?? "",
            clientSecret: process.env.GITHUB_SECRET ?? "",
        }),
    ],
    callbacks: {
        async jwt({ token, profile }) {
            // Store GitHub login username in token on first sign-in
            if (profile) {
                token.username = (profile as any).login;
            }
            return token;
        },
        async session({ session, token }) {
            if (session?.user) {
                (session.user as any).id = token.sub;
                (session.user as any).username = token.username;
            }
            return session;
        },
        async signIn({ profile }) {
            // Store isNewUser flag — we check in redirect callback
            return true;
        },
        async redirect({ url, baseUrl }) {
            // If the callback URL contains onboarding=true, redirect to onboarding
            if (url.includes("onboarding=true")) {
                return `${baseUrl}/onboarding`;
            }
            // Default: allow relative URLs, otherwise use baseUrl
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            if (new URL(url).origin === baseUrl) return url;
            return baseUrl;
        }
    }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
