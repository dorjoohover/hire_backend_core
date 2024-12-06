import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
import { QuestionAnswerEntity } from './entities/question.answer.entity';

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
    let questionCategory = await this.questionCategoryDao.findOne(dto.category);
    if (!questionCategory) {
      throw new HttpException('Category not found', HttpStatus.BAD_REQUEST);
    }
    let questionType = await this.questionTypeDao.findOne(dto.type);
    let typeId = questionType?.id;
    if (!typeId) {
      throw new HttpException('Type not found', HttpStatus.BAD_REQUEST);
    }
    let questionId = await this.questionDao.create({
      ...dto.question,
      type: typeId,
      status: QuestionStatus.ACTIVE,
      category: questionCategory.id,
      createdUser: user,
    });

    dto.answers.category?.map(async (category) => {
      let answerCategory = await this.questionAnswerCategoryDao.findByName(
        category.name,
      );
      if (answerCategory?.id == undefined) {
        answerCategory = await this.questionAnswerCategoryDao.create({
          name: category.name,
          parent: category.parent,
          description: category.description,
        });
      }
    });
    dto.answers.answer.map(async (answer) => {
      const { category, ...answerBody } = answer.value;

      const cate =
        category == null
          ? null
          : typeof category === 'number'
            ? category
            : (await this.questionAnswerCategoryDao.findByName(category)).id;
      const answerId = await this.questionAnswerDao.create({
        question: questionId,
        category: cate,
        ...answerBody,
      } as CreateQuestionAnswerDto);

      if (questionType.name == 'matrix') {
        answer.matrix.map(async (matrix) => {
          let { category, ...body } = matrix;
          const cate =
            category == null
              ? null
              : typeof category === 'number'
                ? category
                : (await this.questionAnswerCategoryDao.findByName(category))
                    .id;

          await this.questionAnswerMatrixDao.create({
            ...(body as CreateQuestionAnswerMatrixDto),
            answer: answerId,
            question: questionId,
            category: cate,
          });
        });
      }
    });
  }

  answerShuffle(dto: QuestionAnswerEntity[]) {
    return dto
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }

  public async findAll() {
    return await this.questionDao.findAll();
  }

  public async findForExam(
    limit: number,
    shuffle: boolean,
    category: number,
    answerShuffle: boolean,
    prevQuestions: number[],
  ) {
    const questions = await this.questionDao.findByCategory(
      limit,
      shuffle,
      category,
      prevQuestions,
    );
    return Promise.all(
      questions.map(async (question) => {
        const answers = await this.questionAnswerDao.findByQuestion(
          question.id,
          answerShuffle,
        );
        return {
          question: question,
          answers: answers,
        };
      }),
    );
  }

  public async findOne(id: number) {
    return await this.questionDao.findOne(id);
  }

  public async deleteAll() {
    await this.questionAnswerMatrixDao.clear();
    await this.questionAnswerDao.clear();
    await this.questionAnswerCategoryDao.clear();
    await this.questionDao.clear();
    await this.questionCategoryDao.clear();
  }
  update(id: number, updateQuestionDto: UpdateQuestionDto) {
    return `This action updates a #${id} question`;
  }

  remove(id: number) {
    return `This action removes a #${id} question`;
  }
}
