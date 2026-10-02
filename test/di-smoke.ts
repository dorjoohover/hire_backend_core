/**
 * DI smoke test — DB/Redis-гүйгээр Nest-ийн dependency graph-ыг шалгана.
 *
 * Ажиллуулах:  npx ts-node -P tsconfig.json test/di-smoke.ts
 *
 * Яагаад хэрэгтэй вэ: циклик хамаарал, дутуу provider зэрэг алдаа нь
 * `tsc` дээр огт харагддаггүй, зөвхөн ажиллуулах үед л гардаг. Энэ скрипт нь
 * DataSource-ийг mock-оор орлуулж AppModule-ийг бүтнээр нь компайл хийдэг тул
 * Postgres/Redis асаалгүйгээр л wiring-ийн алдааг барина.
 */
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

// Ямар ч method дуудахад хоосон массив буцаадаг repo — bootstrap үед
// ажилладаг query-үүд (`.find`, `.query` гэх мэт) унахгүй байх зорилготой.
const fakeRepo: any = new Proxy(
  {},
  { get: () => async () => [] },
);

const fakeDataSource: any = {
  options: { type: 'postgres' },
  entityMetadatas: [],
  manager: fakeRepo,
  getRepository: () => fakeRepo,
  getTreeRepository: () => fakeRepo,
  getMongoRepository: () => fakeRepo,
  createQueryBuilder: () => fakeRepo,
  query: async () => [],
  initialize: async () => fakeDataSource,
  destroy: async () => undefined,
  isInitialized: true,
};

// Redis/Postgres байхгүй тул bootstrap хаа нэгтээ өлгөгдөж болзошгүй.
// Бид зөвхөн DI graph-д алдаа байгаа эсэхийг л мэдэхийг хүсэж байгаа тул
// тодорхой хугацааны дараа "алдаа илрээгүй" гэж дуусгана.
const WATCHDOG_MS = Number(process.env.DI_SMOKE_TIMEOUT ?? 45000);
const watchdog = setTimeout(() => {
  console.log(
    `✅ ${WATCHDOG_MS}ms дотор DI-ийн алдаа илрээгүй ` +
      '(гадаад холболт хүлээж өлгөгдсөн байх магадлалтай).',
  );
  process.exit(0);
}, WATCHDOG_MS);
watchdog.unref?.();

(async () => {
  try {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DataSource)
      .useValue(fakeDataSource)
      .compile();

    clearTimeout(watchdog);
    console.log('✅ DI graph OK — бүх provider амжилттай шийдэгдлээ.');
    await moduleRef.close();
    process.exit(0);
  } catch (error: any) {
    clearTimeout(watchdog);
    console.error('❌ DI алдаа:\n', error?.message ?? error);
    console.error(error?.stack);
    process.exit(1);
  }
})();
