/**
 * MATRIX асуултын хариултын ангилал (`userAnswer.answerCategoryId`).
 *
 * Баганын (questionAnswerMatrix — жиш "Огт үгүй / Сүүлийн 3 сард") ангилал байвал
 * түүнийг, байхгүй бол мөрийн (questionAnswer — жиш "Тамхи", "Согтууруулах ундаа")
 * ангиллыг авна. Өмнө нь зөвхөн баганын ангиллыг хардаг тул мөрөөр ангилсан
 * (ASSIST маягийн) матрицын хариулт ангилалгүй хадгалагддаг байв.
 * Зөвхөн categoryId-г мөрөөс авна — мөрийн reverse/negative/correct матрицад хамаарахгүй.
 */
export function matrixAnswerMeta<
  M extends { categoryId: number | null },
  R extends { categoryId: number | null },
>(matrixMeta: M | undefined, rowMeta: R | undefined): M | undefined {
  if (!matrixMeta) return undefined;
  return {
    ...matrixMeta,
    categoryId: matrixMeta.categoryId ?? rowMeta?.categoryId ?? null,
  };
}
