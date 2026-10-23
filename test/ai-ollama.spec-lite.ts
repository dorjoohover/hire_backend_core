/**
 * AiService.askOllama — AI_PROVIDER=ollama үед локал fake Ollama (/api/chat) руу илгээх хүсэлт
 * (format = JSON schema, num_ctx, system + түүх) болон алдааг 502 болгох (DB-гүй).
 *
 * Ажиллуулах:
 *   npx ts-node --transpile-only -r tsconfig-paths/register test/ai-ollama.spec-lite.ts
 */
import * as http from 'http';
import { AddressInfo } from 'net';
import { AiService } from '../src/app/ai/ai.service';

let failures = 0;
const check = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
};

async function main() {
  let lastBody: any = null;
  let reply: { status: number; body: any } = { status: 200, body: {} };
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      lastBody = req.url === '/api/chat' ? JSON.parse(raw) : null;
      res.writeHead(reply.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  process.env.OLLAMA_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const svc: any = new AiService(null as any, null as any);
  const schema = { type: 'object', properties: { reply: { type: 'string' } }, required: ['reply'] };
  const system = [
    { type: 'text' as const, text: '<tests>\nT\n</tests>' },
    { type: 'text' as const, text: 'SYS' },
  ];
  const errOf = (p: Promise<any>) => p.then(() => null, (e) => e);

  reply = { status: 200, body: { message: { content: '{"reply":"Сайн"}' }, done_reason: 'stop', prompt_eval_count: 10 } };
  const out = await svc.askOllama(system, [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }, { role: 'user', content: 'c' }], schema);
  check('JSON хариуг parse хийнэ', out?.reply === 'Сайн', JSON.stringify(out));
  check('format = JSON schema', JSON.stringify(lastBody?.format) === JSON.stringify(schema));
  check('stream=false, num_ctx=32768 (default)', lastBody?.stream === false && lastBody?.options?.num_ctx === 32768);
  check('system блокууд нэг system мессеж, catalog эхэнд', lastBody?.messages?.[0]?.role === 'system' && lastBody.messages[0].content === '<tests>\nT\n</tests>\n\nSYS');
  check('чатын түүх дараалал хэвээр', JSON.stringify(lastBody?.messages?.slice(1).map((m: any) => m.content)) === '["a","b","c"]');

  await svc.askOllama(system, 'ганц асуулт', schema);
  check('string оролт → нэг user мессеж', lastBody?.messages?.length === 2 && lastBody.messages[1].role === 'user' && lastBody.messages[1].content === 'ганц асуулт');

  reply = { status: 200, body: { message: { content: '{"rep' }, done_reason: 'length' } };
  const eLen = await errOf(svc.askOllama(system, 'x', schema));
  check('done_reason=length → 502', eLen?.getStatus?.() === 502, eLen?.message);

  reply = { status: 404, body: { error: 'model "x" not found' } };
  const e404 = await errOf(svc.askOllama(system, 'x', schema));
  check('Ollama 404 (загвар татаагүй) → 502, мессежтэй', e404?.getStatus?.() === 502 && /not found/.test(e404?.message), e404?.message);

  await new Promise<void>((r) => server.close(() => r()));
  const eDown = await errOf(svc.askOllama(system, 'x', schema));
  check('Ollama асаагүй → 502', eDown?.getStatus?.() === 502, eDown?.message);

  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
