import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/base/base.service';
import { QuestionTypeDao } from './dao/question.type';
import { CreateQuestionTypeDto } from './dto/create-question.type';

@Injectable()
export class QuestionTypeService extends BaseService {
  constructor(private dao: QuestionTypeDao) {
    super();
  }
  public async create(dto: CreateQuestionTypeDto, user: number) {
    return await this.dao.create({ ...dto, createdUser: user });
  }
}
