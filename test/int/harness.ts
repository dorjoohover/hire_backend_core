/**
 * Интеграцийн тестийн (жинхэнэ Postgres) нийтлэг тусгай функцууд.
 *
 * DB: `TEST_DATABASE_URL` (default: docker-compose.test.yml-ийн postgres).
 * ⚠️ Схемийг бүхэлд нь DROP хийдэг тул ЗӨВХӨН хоосон тест DB-д. Prod / local dev DB-ийн
 * URL өгвөл татгалзана.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';

export const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://postgres:postgres@127.0.0.1:55432/hire_test';

export function assertTestDb(url = TEST_DB_URL) {
  const u = new URL(url);
  const local = ['localhost', '127.0.0.1', '::1'].includes(u.hostname);
  const looksTest = /test/i.test(u.pathname.replace('/', ''));
  if (!local || !looksTest) {
    throw new Error(
      `TEST_DATABASE_URL нь local + нэрэнд "test" агуулсан DB байх ёстой (одоо: ${u.hostname}${u.pathname}). Энэ тест схемийг DROP хийдэг.`,
    );
  }
}

/** Хоосон схем дээр entity-үүдээс хүснэгтүүдийг үүсгэсэн DataSource. */
export async function makeDs(opts: { fresh?: boolean } = {}) {
  assertTestDb();
  const ds = new DataSource({
    type: 'postgres',
    url: TEST_DB_URL,
    entities: [__dirname + '/../../src/**/*.entity{.ts,.js}'],
    synchronize: false,
    extra: { max: 1 },
  });
  await ds.initialize();
  if (opts.fresh !== false) {
    await ds.query('DROP SCHEMA IF EXISTS public CASCADE');
    await ds.query('CREATE SCHEMA public');
    await ds.synchronize();
  }
  return ds;
}

let failed = 0;
export const say = console.log.bind(console);
export const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  say(
    `${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`,
  );
};
export const finish = (ds?: DataSource) => async () => {
  await ds?.destroy().catch(() => undefined);
  say(failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} шалгалт унасан`);
  process.exit(failed === 0 ? 0 : 1);
};
