import { ApiProperty } from '@nestjs/swagger';
import { CreateQuestionAnswerCategoryDto } from 'src/app/question/dto/create-question.answer.category.dto';

export class CreateAssessmentDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  description: string;
  @ApiProperty()
  measure: string;
  @ApiProperty()
  usage: string;
  @ApiProperty()
  duration: number;
  @ApiProperty()
  status: number;
  @ApiProperty()
  timeout: boolean;
  @ApiProperty()
  price: number;
  @ApiProperty()
  formule?: number;
  @ApiProperty()
  advice?: string;
  @ApiProperty()
  author?: string;
  @ApiProperty()
  type?: number;
  @ApiProperty()
  report?: number;
  @ApiProperty()
  exampleReport?: string;
  @ApiProperty()
  questionShuffle?: boolean;
  @ApiProperty()
  answerShuffle?: boolean;
  @ApiProperty()
  categoryShuffle?: boolean;
  @ApiProperty()
  questionCount?: number;
  createdUser: number;
  @ApiProperty()
  level: any;
  @ApiProperty()
  category: number;
  @ApiProperty()
  owner?: number;
  @ApiProperty()
  audience?: number;
  @ApiProperty()
  icons?: string;
  @ApiProperty()
  showResultOnComplete?: boolean;
  @ApiProperty()
  blockNavigation?: boolean;

  // --- Тайлангийн monetization (paywall) ---
  /** Үнэгүй харах эрхийн тоо. 0 = хязгааргүй үнэгүй, 1 = зөвхөн нэг удаа. */
  @ApiProperty()
  reportFreeViews?: number;
  /** true бол дэлгэц дээр харах үнэгүй, PDF татахад төлбөртэй. */
  @ApiProperty()
  reportPdfPaid?: boolean;
  /** Тайлан нээх үнэ (₮). 0 бол paywall идэвхгүй. */
  @ApiProperty()
  reportPrice?: number;
  @ApiProperty({ isArray: true, type: CreateQuestionAnswerCategoryDto })
  answerCategories?: CreateQuestionAnswerCategoryDto[];
}
