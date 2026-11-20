import { createApp } from './app.js';
import { createContainer } from './container.js';

const port = Number(process.env.PORT) || 3000;
const container = createContainer();

const server = createApp(container).listen(port, (error) => {
  if (error) throw error;
  console.log(`API listening on port ${port}`);
});

// Node running as PID 1 in a container ignores SIGTERM unless it is handled explicitly.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(async () => {
      await container.pool.end();
      process.exit(0);
    });
  });
}
