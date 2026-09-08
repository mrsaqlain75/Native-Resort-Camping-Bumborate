import { createHash } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { env } from "./lib/env";

/**
 * Returns short-lived signed parameters so the browser can upload a file
 * straight to Cloudinary without ever seeing the API secret.
 */
export const cloudinaryRouter = createRouter({
  signUpload: authedQuery
    .input(
      z.object({
        folder: z.string().default("native-resort/expense-receipts"),
      })
    )
    .mutation(({ input }) => {
      if (
        !env.cloudinaryCloudName ||
        !env.cloudinaryApiKey ||
        !env.cloudinaryApiSecret
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Image uploads are not configured",
        });
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const toSign = `folder=${input.folder}&timestamp=${timestamp}`;
      const signature = createHash("sha1")
        .update(toSign + env.cloudinaryApiSecret)
        .digest("hex");

      return {
        cloudName: env.cloudinaryCloudName,
        apiKey: env.cloudinaryApiKey,
        timestamp,
        folder: input.folder,
        signature,
      };
    }),
});
