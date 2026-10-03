import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuestionType } from 'src/base/constants';
import { QuestionRuleDao } from './dao/question.rule.dao';
import { QuestionRuleAction } from './entities/question.rule.entity';

/**
 * Нөхцөлт алгасах (branching) дүрмийн шалгалт.
 *
 * Өмнө нь `POST /question/rule` юуг ч шалгалгүй хадгалдаг байсан тул өөрөө өөр
 * рүүгээ, цикл, өөр асуултын хариулт, ДАРААГИЙН блокийн асуултаас хамаарах,
 * давхардсан дүрэм бүгд орж, client / server хоёр өөрөөр тайлбарлаж болзошгүй
 * байв (0.х №2 (2)–(3)).
 *
 * Нөхцөл болгох асуулт нь SINGLE (10) / MULTIPLE (20) / MATRIX (40):
 *   - SINGLE / MULTIPLE: `dependsOnAnswerId` = сонгосон хариулт (client-д
 *     `answers[questionId]` нь answer id эсвэл тэдгээрийн массив; server `userAnswer.answerId`).
 *   - MATRIX: `dependsOnAnswerId` = мөр (жиш: "Тамхи"), `dependsOnMatrixId` = тэр мөрийн
 *     нүд / багана (жиш: "Үгүй"). Client-д `answers[questionId] = { [мөр]: нүд }`, server
 *     `userAnswer.answerId` + `matrixId`. Нүдгүй бол мөрөнд ямар нэг хариулт өгсөн л бол.
 * SLIDER / TEXT / TRUE_FALSE-д answer id-аар жиших боломжгүй тул нөхцөл болохгүй.
 *
 * Алгасах нэгж: `targetAnswerId` null бол бүтэн асуулт; өгвөл MATRIX алгасах асуултын
 * зөвхөн тэр МӨР (questionAnswer, жиш: дараагийн матрицын "Тамхи" мөр) хасагдана.
 */
export const RULE_CONDITION_TYPES: number[] = [
  QuestionType.SINGLE,
  QuestionType.MULTIPLE,
  QuestionType.MATRIX,
];

export interface RuleInput {
  targetQuestionId?: any;
  dependsOnQuestionId?: any;
  dependsOnAnswerId?: any;
  dependsOnMatrixId?: any;
  targetAnswerId?: any;
  action?: any;
  active?: any;
}

export interface QuestionMeta {
  id: number;
  type: number;
  categoryId: number | null;
  categoryOrder: number | null;
  assessmentId: number | null;
}

const toId = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : NaN;
};
const num = (v: any): number | null =>
  v === null || v === undefined ? null : Number(v);

@Injectable()
export class QuestionRuleService {
  constructor(private readonly dao: QuestionRuleDao) {}

  /** Нэгдсэн шалгалт. Алдаа гарвал BadRequest / NotFound шиднэ; хэвийн бол цэвэрлэсэн дүрмийг буцаана. */
  async validate(input: RuleInput, ignoreId?: number) {
    const bad = (m: string) => new BadRequestException(m);

    const target = toId(input.targetQuestionId);
    const dep = toId(input.dependsOnQuestionId);
    const ans = toId(input.dependsOnAnswerId);
    if (target === null || Number.isNaN(target))
      throw bad('Алгасах асуултын id буруу байна.');
    if (dep === null || Number.isNaN(dep))
      throw bad('Нөхцөл асуултын id буруу байна.');
    if (Number.isNaN(ans)) throw bad('Хариултын id буруу байна.');
    const mat = toId(input.dependsOnMatrixId);
    if (Number.isNaN(mat)) throw bad('Матрицын баганын (нүдний) id буруу байна.');
    const row = toId(input.targetAnswerId);
    if (Number.isNaN(row)) throw bad('Хасах мөрийн id буруу байна.');

    const action = input.action ?? QuestionRuleAction.SKIP;
    if (action !== QuestionRuleAction.SKIP)
      throw bad("Зөвхөн 'skip' (алгасах) үйлдэл дэмжигдэнэ.");

    if (target === dep) throw bad('Асуулт өөрөөсөө хамаарч болохгүй.');

    const metas = await this.dao.findQuestionMeta([target, dep]);
    const byId = new Map<number, QuestionMeta>(
      metas.map((m) => [
        Number(m.id),
        {
          id: Number(m.id),
          type: Number(m.type),
          categoryId: num(m.categoryId),
          categoryOrder: num(m.categoryOrder),
          assessmentId: num(m.assessmentId),
        },
      ]),
    );
    const t = byId.get(target);
    const d = byId.get(dep);
    if (!t) throw new NotFoundException('Алгасах асуулт олдсонгүй.');
    if (!d) throw new NotFoundException('Нөхцөл асуулт олдсонгүй.');

    if (
      t.assessmentId !== null &&
      d.assessmentId !== null &&
      t.assessmentId !== d.assessmentId
    )
      throw bad('Хоёр асуулт нэг тестийнх байх ёстой.');

    if (!RULE_CONDITION_TYPES.includes(d.type))
      throw bad(
        'Нөхцөл болгох асуулт нь нэг / олон сонголттой (SINGLE / MULTIPLE) эсвэл матриц (MATRIX) байх ёстой.',
      );
    if (mat !== null && d.type !== QuestionType.MATRIX)
      throw bad('Багана (нүд) зөвхөн матриц асуултын нөхцөлд сонгогдоно.');
    if (mat !== null && ans === null)
      throw bad('Матрицын баганыг сонгохын өмнө мөрийг сонгоно уу.');

    if (ans !== null) {
      const owner = await this.dao.findAnswerQuestionId(ans);
      if (owner === null || Number(owner) !== dep)
        throw bad('Сонгосон хариулт нь нөхцөл асуултынх биш байна.');
    }
    if (mat !== null) {
      const cell = await this.dao.findMatrixOwner(mat);
      if (
        !cell ||
        cell.answerId !== ans ||
        (cell.questionId !== null && cell.questionId !== dep)
      )
        throw bad('Сонгосон багана нь энэ мөрийнх биш байна.');
    }

    if (row !== null) {
      if (t.type !== QuestionType.MATRIX)
        throw bad('Мөр хасах нь зөвхөн матриц (MATRIX) асуултад боломжтой.');
      const owner = await this.dao.findAnswerQuestionId(row);
      if (owner === null || Number(owner) !== target)
        throw bad('Хасах мөр нь алгасах асуултынх биш байна.');
    }

    // Хэсгүүд дараалалтай нээгддэг: нөхцөл асуулт нь алгасах асуултаас ӨМНӨХ
    // (эсвэл ижил) блокт байж, аль хэдийн хариулагдсан байх ёстой.
    if (
      t.categoryOrder !== null &&
      d.categoryOrder !== null &&
      d.categoryOrder > t.categoryOrder
    )
      throw bad(
        'Нөхцөл асуулт нь алгасах асуултаас ӨМНӨХ (эсвэл ижил) блокт байх ёстой.',
      );

    const all = (await this.dao.findAll()).filter(
      (r) => r.action === QuestionRuleAction.SKIP && r.id !== ignoreId,
    );

    if (
      all.some(
        (r) =>
          Number(r.targetQuestionId) === target &&
          Number(r.dependsOnQuestionId) === dep &&
          (r.dependsOnAnswerId == null ? null : Number(r.dependsOnAnswerId)) ===
            ans &&
          ((r as any).dependsOnMatrixId == null
            ? null
            : Number((r as any).dependsOnMatrixId)) === mat &&
          ((r as any).targetAnswerId == null
            ? null
            : Number((r as any).targetAnswerId)) === row,
      )
    )
      throw bad('Ийм дүрэм аль хэдийн бүртгэлтэй байна.');

    // Цикл: шинэ дүрэм `target ← dep`. Хэрэв `dep` нь (шууд / шууд бусаар)
    // `target`-аас хамаарч байвал хоёр асуулт бие биенээ алгасуулна.
    const dependsOn = new Map<number, number[]>();
    for (const r of all) {
      const k = Number(r.targetQuestionId);
      (dependsOn.get(k) ?? dependsOn.set(k, []).get(k)).push(
        Number(r.dependsOnQuestionId),
      );
    }
    const seen = new Set<number>();
    const stack = [dep];
    while (stack.length) {
      const cur = stack.pop();
      if (cur === target)
        throw bad(
          'Дүрмүүд цикл үүсгэж байна (асуултууд бие биеэсээ хамаарна).',
        );
      if (seen.has(cur)) continue;
      seen.add(cur);
      stack.push(...(dependsOn.get(cur) ?? []));
    }

    return {
      targetQuestionId: target,
      dependsOnQuestionId: dep,
      dependsOnAnswerId: ans,
      dependsOnMatrixId: mat,
      targetAnswerId: row,
      action: QuestionRuleAction.SKIP,
      active: input.active === undefined ? true : !!input.active,
    };
  }

  async create(input: RuleInput) {
    const clean = await this.validate(input);
    return await this.dao.create(clean);
  }

  /**
   * Засвар / идэвхжүүлэх. Зөвхөн `active: false` бол шалгахгүй (хуучин, буруу
   * дүрмийг ч унтрааж болно); бусад тохиолдолд нэгтгэсэн дүрмийг дахин шалгана.
   */
  async update(id: number, patch: RuleInput) {
    const cur = await this.dao.findOne(id);
    if (!cur) throw new NotFoundException('Дүрэм олдсонгүй.');
    const keys = Object.keys(patch).filter((k) => patch[k] !== undefined);
    if (!keys.length) throw new BadRequestException('Өөрчлөх талбар алга.');

    if (keys.length === 1 && keys[0] === 'active' && patch.active === false) {
      await this.dao.updateOne(id, { active: false });
      return { id, active: false };
    }

    const merged = {
      targetQuestionId: patch.targetQuestionId ?? cur.targetQuestionId,
      dependsOnQuestionId: patch.dependsOnQuestionId ?? cur.dependsOnQuestionId,
      dependsOnAnswerId:
        patch.dependsOnAnswerId !== undefined
          ? patch.dependsOnAnswerId
          : cur.dependsOnAnswerId,
      // Нөхцөл асуулт / мөр өөрчлөгдсөн бол хуучин нүд хүчингүй.
      dependsOnMatrixId:
        patch.dependsOnMatrixId !== undefined
          ? patch.dependsOnMatrixId
          : patch.dependsOnAnswerId !== undefined ||
              patch.dependsOnQuestionId !== undefined
            ? null
            : cur.dependsOnMatrixId,
      // Алгасах асуулт солигдсон бол хуучин мөр хүчингүй.
      targetAnswerId:
        patch.targetAnswerId !== undefined
          ? patch.targetAnswerId
          : patch.targetQuestionId !== undefined
            ? null
            : (cur as any).targetAnswerId,
      action: patch.action ?? cur.action,
      active: patch.active !== undefined ? patch.active : cur.active,
    };
    const clean = await this.validate(merged, id);
    await this.dao.updateOne(id, clean);
    return { id, ...clean };
  }
}
