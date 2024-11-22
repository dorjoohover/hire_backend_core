import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/base/base.service';
import { QuestionAnswerDao } from './dao/question.answer.dao';
import { CreateQuestionAnswerDto } from './dto/create-question.answer.dto';
import { QuestionAnswerMatrixDao } from './dao/question.answer.matrix.dao';
import { CreateQuestionAnswerMatrixDto } from './dto/create-question.answer.matrix.dto';

@Injectable()
export class QuestionAnswerService extends BaseService {
  constructor(
    private dao: QuestionAnswerDao,
    private matrix: QuestionAnswerMatrixDao,
  ) {
    super();
  }
  public async create(dto: CreateQuestionAnswerDto) {
    return await this.dao.create(dto);
  }

  public async createMatrix(dto: CreateQuestionAnswerMatrixDto) {
    return await this.matrix.create(dto);
  }

  public async findAll() {
    return await this.dao.findAll();
  }

  public async findOne(id: number) {
    return await this.dao.findOne(id);
  }
}
