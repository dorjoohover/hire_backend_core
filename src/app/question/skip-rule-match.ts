/**
 * Нөхцөлт алгасах дүрэм өмнөх хариултаар (userAnswer мөрүүд) биелсэн эсэх — серверийн
 * тал (exam.service getQuestions: хэсэг хооронд асуулт шүүх). Client тал нь
 * web/app/utils/examAnswers.js `computeHiddenQuestionIds` (ижил дүрэм).
 *
 *   dependsOnMatrixId  → MATRIX: тухайн мөр (dependsOnAnswerId)-д яг тэр нүд сонгогдсон
 *   dependsOnAnswerId  → тэр хариулт (SINGLE / MULTIPLE) эсвэл мөр (MATRIX) хариулагдсан
 *   аль нь ч үгүй      → нөхцөл асуултад ямар нэг хариулт өгсөн
 */
export interface PriorAnswerRow {
  questionId: number | string;
  answerId: number | string | null;
  matrixId?: number | string | null;
}

export interface PriorAnswerIndex {
  questions: Set<number>;
  pairs: Set<string>;
  cells: Set<string>;
}

export const indexPriorAnswers = (prior: PriorAnswerRow[]): PriorAnswerIndex => {
  const questions = new Set<number>();
  const pairs = new Set<string>();
  const cells = new Set<string>();
  for (const p of prior ?? []) {
    const q = Number(p.questionId);
    questions.add(q);
    if (p.answerId == null) continue;
    pairs.add(`${q}:${Number(p.answerId)}`);
    if (p.matrixId != null) cells.add(`${q}:${Number(p.answerId)}:${Number(p.matrixId)}`);
  }
  return { questions, pairs, cells };
};

export const isSkipRuleMatched = (
  rule: { dependsOnQuestionId: any; dependsOnAnswerId?: any; dependsOnMatrixId?: any },
  idx: PriorAnswerIndex,
): boolean => {
  const dq = Number(rule.dependsOnQuestionId);
  if (rule.dependsOnMatrixId != null) {
    return idx.cells.has(`${dq}:${Number(rule.dependsOnAnswerId)}:${Number(rule.dependsOnMatrixId)}`);
  }
  if (rule.dependsOnAnswerId != null) {
    return idx.pairs.has(`${dq}:${Number(rule.dependsOnAnswerId)}`);
  }
  return idx.questions.has(dq);
};

export interface SkipRuleLike {
  targetQuestionId: any;
  dependsOnQuestionId: any;
  dependsOnAnswerId?: any;
  dependsOnMatrixId?: any;
  /** MATRIX алгасах асуултын зөвхөн энэ мөр (questionAnswer.id); null = бүтэн асуулт */
  targetAnswerId?: any;
  action?: any;
}

/**
 * Биелсэн дүрмүүдийг асуултын жагсаалтад хэрэглэнэ (exam getQuestions):
 *   targetAnswerId == null → асуултыг бүхэлд нь хасна;
 *   targetAnswerId != null → тэр асуултын `answers`-аас (MATRIX мөр) тэр мөрийг хасна —
 *   бүх мөр нь хасагдвал асуултыг бүхэлд нь.
 * Оролтын массив / объектуудыг өөрчлөхгүй (мөр хасагдсан асуулт шинэ объект).
 */
export const applyMatchedSkipRules = <
  T extends { question?: { id?: any } | null; answers?: { id?: any }[] | null },
>(
  questions: T[],
  rules: SkipRuleLike[],
  idx: PriorAnswerIndex,
): T[] => {
  const skipQuestions = new Set<number>();
  const skipRows = new Map<number, Set<number>>();
  for (const r of rules ?? []) {
    if (r.action != null && r.action !== 'skip') continue;
    if (!isSkipRuleMatched(r, idx)) continue;
    const t = Number(r.targetQuestionId);
    if (r.targetAnswerId == null) skipQuestions.add(t);
    else {
      if (!skipRows.has(t)) skipRows.set(t, new Set());
      skipRows.get(t).add(Number(r.targetAnswerId));
    }
  }
  if (!skipQuestions.size && !skipRows.size) return questions;
  const out: T[] = [];
  for (const x of questions) {
    const id = Number(x?.question?.id);
    if (skipQuestions.has(id)) continue;
    const rows = skipRows.get(id);
    if (rows && Array.isArray(x.answers) && x.answers.length) {
      const kept = x.answers.filter((a) => !rows.has(Number(a?.id)));
      if (!kept.length) continue;
      out.push(kept.length === x.answers.length ? x : { ...x, answers: kept });
      continue;
    }
    out.push(x);
  }
  return out;
};
