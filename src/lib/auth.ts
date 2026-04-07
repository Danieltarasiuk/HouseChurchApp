import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcryptjs from 'bcryptjs';

// TODO: Connect to database for user storage
// For now, we'll use dummy credentials for testing

const users = [
  {
    id: '1',
    email: 'danny@housechurch.local',
    password: 'hashed_password', // In production, use proper hashing
    name: 'Danny',
    role: 'pastor',
  },
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // TODO: Query database for user
        const user = users.find((u) => u.email === credentials.email);

        if (!user) {
          return null;
        }

        // TODO: Use proper password verification
        const passwordMatch = credentials.password === 'password123';

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
