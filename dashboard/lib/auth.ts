import type { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
export const authOptions: NextAuthOptions = {
  trustHost: true,
  providers: [DiscordProvider({ clientId: process.env.DISCORD_CLIENT_ID!, clientSecret: process.env.DISCORD_CLIENT_SECRET!, issuer: 'https://discord.com', authorization: { params: { scope: 'identify guilds' } } })],
  callbacks: {
    async jwt({ token, account, profile }: any) { if (account) token.accessToken = account.access_token; if (profile) token.uid = profile.id; return token; },
    async session({ session, token }: any) { session.accessToken = token.accessToken; session.uid = token.uid; return session; },
  },
};
