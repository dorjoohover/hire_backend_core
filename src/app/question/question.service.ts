import { Injectable } from '@nestjs/common';
import {
  CreateQuestionAllDto,
  CreateQuestionDto,
} from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionDao } from './dao/question.dao';
import { QuestionAnswerDao } from './dao/question.answer.dao';
import { QuestionAnswerMatrixDao } from './dao/question.answer.matrix.dao';
import { QuestionAnswerCategoryDao } from './dao/question.answer.category.dao';
import { QuestionCategoryDao } from './dao/question.category.dao';
import { CreateQuestionCategoryDto } from './dto/create-question.category.dto';
import { QuestionTypeDao } from './dao/question.type';
import { CreateQuestionTypeDto } from './dto/create-question.type';
import { CreateQuestionAnswerDto } from './dto/create-question.answer.dto';
import { CreateQuestionAnswerMatrixDto } from './dto/create-question.answer.matrix.dto';
import { QuestionStatus } from 'src/base/constants';

@Injectable()
export class QuestionService {
  constructor(
    private questionDao: QuestionDao,
    private questionAnswerDao: QuestionAnswerDao,
    private questionTypeDao: QuestionTypeDao,
    private questionAnswerMatrixDao: QuestionAnswerMatrixDao,
    private questionAnswerCategoryDao: QuestionAnswerCategoryDao,
    private questionCategoryDao: QuestionCategoryDao,
  ) {}
  public async create(dto: CreateQuestionDto) {
    return await this.questionDao.create(dto);
  }
  public async createAll(dto: CreateQuestionAllDto, user: number) {
    let questionCategoryId = dto.category.id;
    if (!questionCategoryId) {
      const { id: id, ...categoryBody } = dto.category;
      questionCategoryId = await this.questionCategoryDao.create(
        categoryBody as CreateQuestionCategoryDto,
      );
    }
    let typeId = dto.type.id;
    if (!typeId) {
      const { id: id, ...typeBody } = dto.type;
      typeId = await this.questionTypeDao.create(
        typeBody as CreateQuestionTypeDto,
      );
    }
    let type = await (await this.questionTypeDao.findOne(typeId)).name;

    let questionId = await this.questionDao.create({
      ...dto.question,
      type: typeId,
      status: QuestionStatus.ACTIVE,
      category: questionCategoryId,
      createdUser: user,
    });

    dto.answers.map(async (answer) => {
      let answerCategoryId = answer.category.id;
      if (!answerCategoryId) {
        answerCategoryId = await this.questionAnswerCategoryDao.create({
          name: answer.category.name,
          parent: answer.category.parent,
          description: answer.category.description,
        });
      }
      let answerId = answer.answer.value.id;
      const { id, ...answerBody } = answer.answer.value;
      if (!answerId)
        answerId = await this.questionAnswerDao.create({
          ...(answerBody as CreateQuestionAnswerDto),
          question: questionId,
        });

      if (type == 'matrix') {
        answer.answer.matrix.map(async (matrix) => {
          let { id, ...body } = matrix;
          if (!id) {
            await this.questionAnswerMatrixDao.create({
              ...(body as CreateQuestionAnswerMatrixDto),
              answer: answerId,
              question: questionId,
              category: answerCategoryId,
            });
          }
        });
      }
    });
  }

  public async findAll() {
    return await this.questionDao.findAll();
  }

  public async findOne(id: number) {
    return await this.questionDao.findOne(id);
  }

  update(id: number, updateQuestionDto: UpdateQuestionDto) {
    return `This action updates a #${id} question`;
  }

  remove(id: number) {
    return `This action removes a #${id} question`;
  }
}
