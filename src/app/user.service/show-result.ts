/**
 * №6: "Шалгалт дуусмагц шалгуулагч өөрийн үр дүнг харах эсэх" — service (QR / урилгын багц) БҮРД тусдаа.
 * `userService.showResult` (null = assessment-ийн `showResultOnComplete` default-ийг дага).
 * Өмнө нь QR үүсгэхэд assessment-ийн глобал утгыг өөрчилдөг байсан → тухайн assessment-ийн БҮХ хэрэглэгчид нөлөөлнө.
 */
export const effectiveShowResult = (
  service?: { showResult?: boolean | null } | null,
  assessment?: { showResultOnComplete?: boolean | null } | null,
): boolean => service?.showResult ?? assessment?.showResultOnComplete ?? true;
