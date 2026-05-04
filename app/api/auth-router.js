import { router, publicProcedure } from './trpc.js';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authRouter = router({
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      const { email, password } = input;
      
      // Simple test login - accepts any email/password for now
      if (email && password) {
        return {
          success: true,
          token: "test-token-123",
          user: {
            id: 1,
            email: email,
            name: "Test User",
            role: "admin",
          },
        };
      }
      
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }),
});
