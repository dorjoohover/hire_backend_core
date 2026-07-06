import { Injectable } from '@nestjs/common';
import { QuestionAnswerCategoryDao } from './dao/question.answer.category.dao';
import { CreateQuestionAnswerCategoryDto } from './dto/create-question.answer.category.dto';
import { BaseService } from 'src/base/base.service';

@Injectable()
export class QuestionAnswerCategoryService extends BaseService {
  constructor(private dao: QuestionAnswerCategoryDao) {
    super();
  }
  public async create(dto: CreateQuestionAnswerCategoryDto) {
    return await this.dao.create(dto);
  }

  public async findAll() {
    return await this.dao.findAll();
  }

  // Studio-ийн AI Data tab-д "Хариултын ангилал" (DISC-ийн D/i/S/C гэх мэт)
  // сонголт харуулахад ашиглана.
  public async findByAssessment(assessmentId: number) {
    return await this.dao.findByAssessment(assessmentId);
  }

  public async findOne(id: number) {
    return await this.dao.findOne(id);
  }
}
