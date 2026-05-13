import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { findUserByEmail, createOrGetOwner, createOrGetManager } from "./queries/users";
import { verifyPassword, generateToken } from "./lib/auth";
import { ErrorMessages } from "@contracts/constants";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authRouter = createRouter({
  login: publicQuery
    .input(loginSchema)
    .mutation(async ({ input }) => {
      const { email, password } = input;
      
      // Create users on first login attempt
      await createOrGetOwner();
      await createOrGetManager();
      
      const user = await findUserByEmail(email);
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }
      
      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }
      
      const token = generateToken(user.id, user.email, user.role);
      
      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    }),
    
  me: authedQuery.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: ErrorMessages.unauthenticated,
      });
    }
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
      role: ctx.user.role,
      avatar: ctx.user.avatar,
    };
  }),
  
  logout: authedQuery.mutation(async () => {
    return { success: true };
  }),
});
