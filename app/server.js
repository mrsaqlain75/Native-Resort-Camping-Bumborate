import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from './api/router.js';
import { createContext } from './api/context.js';

const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));

app.use('/api/trpc/*', async (c) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

const port = 3000;
console.log(`Starting server on http://localhost:${port}`);

serve({ fetch: app.fetch, port }, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});

export default app;
