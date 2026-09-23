## Юу, яагаад
<!-- 1–3 мөр. Гарчиг: `feat:` / `fix:` / `perf:` / `docs:` / `refactor:` / `test:` / `chore:` -->

## Definition of Done
- [ ] Feature doc: `docs/features/…` холбоос / шинэчлэл (status, prs, shipped_in): <холбоос>
- [ ] Тест нэмсэн / шинэчилсэн: `npm run test:ci` (+ DB-тэй бол `npm run test:int`)
- [ ] DDL байхгүй, ЭСВЭЛ `perf-bootstrap.ts` (идемпотент) / `ops/shared/*.sql` дотор + `node scripts/gen-check-ddl.js` дахин ажилласан
- [ ] Шинэ env / flag байвал `ops/shared/app-env-*.md`-д нэмсэн (утга биш, нэр)
- [ ] Харах metric / лог тодорхой (Monitor, `ops-report.sh`)
- [ ] Нууц утга, PII commit / лог-д орсонгүй
- [ ] Rollback: <буцаах арга — image digest, DDL буцаах эсэх>
- [ ] Бусад repo-той хамаарал (report / web / admin) — deploy дараалал: <core → …>

## Гараар шалгасан
<!-- Local / Test-д юу хийж юу харсан (runbook gate дугаар) -->
