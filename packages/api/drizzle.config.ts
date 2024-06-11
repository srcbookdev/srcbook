import { defineConfig } from 'drizzle-kit';
import Path from 'node:path';

export default defineConfig({
  schema: './db/schema.mts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: Path.join(process.env.HOME || '~', '.srcbook', 'srcbook.db'),
  },
});
