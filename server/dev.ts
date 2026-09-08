// Local development server. Production runs on Vercel via api/index.ts.
import { serve } from "@hono/node-server";
import app from "./app";

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
  console.log(`API dev server running on http://localhost:${port}`);
});
