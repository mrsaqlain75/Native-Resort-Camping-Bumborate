import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      // Use environment variable with fallback for local dev
      url: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/trpc',
    }),
  ],
});