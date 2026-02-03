import NextAuth, { NextAuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"

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
        }
    }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
