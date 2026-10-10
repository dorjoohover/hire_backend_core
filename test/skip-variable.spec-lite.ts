// Studio "Алгасалт" хувьсагч (kind='skip') — core-ийн хадгалахын өмнөх шалгалт (skip-variable.ts)
// + test ↔ prod зөөхөд асуултын ID солигдох (remapQuestionTokens).
import { normalizeSkipVariableRules } from '../src/app/pdf-template/skip-variable';
import { remapQuestionTokens } from '../src/app/assessment-transfer/assessment-bundle';

let fail = 0;
const eq = (name: string, got: any, want: any) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? '✅' : '❌'} ${name}: ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

eq('буруу оролт → null', [
  normalizeSkipVariableRules(null),
  normalizeSkipVariableRules({ scope: 'x' }),
  normalizeSkipVariableRules({ scope: 'questions', questions: [] }),
  normalizeSkipVariableRules({ scope: 'category', category: '  ' }),
], [null, null, null, null]);

eq('асуултууд: тоо / token хэлбэр, давхардал, буруу утгыг хасна', normalizeSkipVariableRules({
  scope: 'questions', questions: [101, 'question[ 102 ]', '101', 'abc'], category: 'HADS', mode: 'any', output: 'text', skippedText: 'A',
}), {
  scope: 'questions', questions: ['question[101]', 'question[102]'], category: '', answers: [], mode: 'any', min: 1, output: 'text', skippedText: 'A', answeredText: '',
});

eq('бүлэг: анхдагч утгууд', normalizeSkipVariableRules({ scope: 'category', category: ' HADS ', questions: ['question[1]'], mode: 'fewer', min: '3' }), {
  scope: 'category', questions: [], category: 'HADS', answers: [], mode: 'fewer', min: 3, output: 'number', skippedText: '', answeredText: '',
});

eq('хариултаар: асуулт + хариулт заавал, эхний асуулт л', [
  normalizeSkipVariableRules({ scope: 'answer', questions: ['question[2875]'], answers: [] }),
  normalizeSkipVariableRules({ scope: 'answer', questions: [], answers: ['Үгүй'] }),
  normalizeSkipVariableRules({ scope: 'answer', questions: [2875, 2876], answers: [' Үгүй ', 'Үгүй', '', 'Хэзээ ч үгүй'] }),
], [null, null, {
  scope: 'answer', questions: ['question[2875]'], category: '', answers: ['Үгүй', 'Хэзээ ч үгүй'], mode: 'all', min: 1, output: 'number', skippedText: '', answeredText: '',
}]);

const rules = normalizeSkipVariableRules({ scope: 'questions', questions: ['question[101]', 'question[999]'] });
const unknown = new Set<number>();
eq('зөөхөд ID солигдоно (олдоогүй нь хэвээр)', remapQuestionTokens(rules, new Map([[101, 5101]]), unknown).questions, ['question[5101]', 'question[999]']);
eq('олдоогүй ID тайлагнагдана', [...unknown], [999]);

console.log(fail ? `\n${fail} FAIL` : '\nALL OK');
process.exit(fail ? 1 : 0);
