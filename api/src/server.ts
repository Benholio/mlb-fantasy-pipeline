import Fastify from 'fastify';
import cors from '@fastify/cors';
import { playersRoutes } from './routes/players.js';
import { gamesRoutes } from './routes/games.js';
import { fantasyRoutes } from './routes/fantasy.js';
import { searchRoutes } from './routes/search.js';

export async function buildServer() {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: { colorize: true },
            }
          : undefined,
    },
  });

  // Register CORS
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  // Health check
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  await server.register(playersRoutes, { prefix: '/api/players' });
  await server.register(gamesRoutes, { prefix: '/api/games' });
  await server.register(fantasyRoutes, { prefix: '/api/fantasy' });
  await server.register(searchRoutes, { prefix: '/api/search' });

  return server;
}
