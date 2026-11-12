// tsc không chép file .sql: đưa migration vào thư mục build để `node dist/server.js` đọc được.
import { cpSync } from 'node:fs';

const source = new URL('../src/db/migrations/', import.meta.url);
const target = new URL('../dist/db/migrations/', import.meta.url);
cpSync(source, target, { recursive: true });
