import { config } from 'dotenv';
import { buildServer } from './server.js';
import { closeSql } from './db/client.js';

// Load env from root .env file
config({ path: '../.env' });

const PORT = parseInt(process.env.API_PORT || '3001', 10);
const HOST = process.env.API_HOST || '0.0.0.0';

async function main() {
  const server = await buildServer();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await server.close();
    await closeSql();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`API server running at http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
