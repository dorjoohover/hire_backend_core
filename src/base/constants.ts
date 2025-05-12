export const DEFAULT_SIZE = 20;

export const DEFAULT_LIMIT = 20;
export const DEFAULT_OFFSET = 0;

// admin nemeh bolomjtoi
export const SUPER_ADMIN = 10;
// baiguullagiin mongo nemeh bolomjtoi
export const ADMIN = 40;
// zowhon test nemeh bolomjtoi
export const TESTER = 50;
// ORGANIZATION
export const CLIENT = 20;
// ZOCHIN
export const ORGANIZATION = 30;
// BURTGELGUI HEREGLECH
// export const ANONYMOUS = 40;

export const QuestionLevel = {
  HARD: 10,
  MEDIUM: 20,
  EASY: 30,
};

export const QuestionCategoryType = {
  QUESTION: 10,
  CATEGORY: 20,
};

export const QuestionStatus = {
  ACTIVE: 10,
  DELETED: 20,
  PASSIVE: 30,
};

export const QuestionType = {
  SINGLE: 10,
  MULTIPLE: 20,
  TRUEFALSE: 30,
  MATRIX: 40,
  CONSTANTSUM: 50,
  SLIDER: 60,
};

export const AssessmentType = {
  TEST: 10,
  UNELGEE: 20,
};

export const ReportType = {
  CORRECT: 10,
  CORRECTCOUNT: 11,
  DISC: 20,
  MBTI: 30,
  BELBIN: 40,
  GENOS: 50,
  NARC: 60,
  SETGEL: 70,
};
export const BlogType = {
  BLOG: 10,
  ADVICE: 20,
};

export const PaymentStatus = {
  PENDING: 10,
  SUCCESS: 20,
  FAILED: 30,
  ERROR: 40,
};

export const FeedbackType = {
  // dunduur awah
  SERVICE: 10,
  // togsgold awah
  RESULT: 20,
};
export const ContactType = {
  SUPPLIER: 10,
  PARTNER: 20,
  FEEDBACK: 30,
  OTHER: 40,
};

export const FeedbackStatus = {
  GOOD: 10,
  NORMAL: 20,
  BAD: 30,
};

export const PaymentTypeDict = {
  1: 'Карт',
  2: 'QPay',
  3: 'Мобайл',
  4: 'Зээл',
  5: 'Сошиал пэй',
};

export const PaymentType = {
  LOYALTY: 1,
  QPAY: 2,
  BANK: 3,
  COST: 4,
};

export const ProductMeasureUnit = {
  LITER: 10,
  PIECE: 20,
};

export const SaleStatus = {
  DELETED: -10,
  ORDERED: 10,
  DELIVERED: 20,
  REFUNDED: 30,
};

export const TerminalStatus = {
  ACTIVE: 10,
  DELETED: 20,
};

export const ProductVatType = {
  VAT: 10,
  VAT_FREE: 20,
  VAT_ZERO: 30,
};

export const ProductMeasureUnitDict = {
  10: 'л',
  20: 'ш',
};

export const SaleStatusDict = {
  '-10': 'Устгасан',
  10: 'Үүссэн',
  20: 'Ээлж хаасан',
};
