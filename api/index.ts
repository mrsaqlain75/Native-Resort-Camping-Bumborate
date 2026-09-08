// Vercel serverless entrypoint. All backend source lives in ../server so that
// Vercel does not try to treat each backend module as its own function.
import { handle } from "hono/vercel";
import app from "../server/app";

export const config = {
  runtime: "nodejs",
};

export default handle(app);
