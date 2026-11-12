import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = buildApp(config);

const shutdownSignals = ['SIGINT', 'SIGTERM'] as const;
for (const signal of shutdownSignals) {
  process.once(signal, () => {
    app.close().then(
      () => process.exit(0),
      (error: unknown) => {
        app.log.error(error, 'Đóng server thất bại');
        process.exit(1);
      },
    );
  });
}

try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error, 'Không khởi động được server');
  process.exit(1);
}
