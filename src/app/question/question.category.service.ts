import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/base/base.service';
import { QuestionCategoryDao } from './dao/question.category.dao';
import { CreateQuestionCategoryDto } from './dto/create-question.category.dto';

@Injectable()
export class QuestionCategoryService extends BaseService {
  constructor(private dao: QuestionCategoryDao) {
    super();
  }

  public async create(dto: CreateQuestionCategoryDto, user: number) {
    return await this.dao.create({
      ...dto,
      createdUser: user,
    });
  }
}
