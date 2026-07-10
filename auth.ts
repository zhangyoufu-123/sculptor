import NextAuth from "next-auth";
import Email from "next-auth/providers/email";
import { SupabaseAdapter } from "@auth/supabase-adapter";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    Email({
      server: {},
      from: "noreply@sculptor.app",
      sendVerificationRequest: async ({ identifier: email, url }) => {
        console.log(`\n📧 Magic link for ${email}:\n${url}\n`);
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
