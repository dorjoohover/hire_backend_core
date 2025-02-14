import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  CreateQuestionAllAnswerDto,
  CreateQuestionAllDto,
  CreateQuestionDto,
} from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionDao } from './dao/question.dao';
import { QuestionAnswerDao } from './dao/question.answer.dao';
import { QuestionAnswerMatrixDao } from './dao/question.answer.matrix.dao';
import { QuestionAnswerCategoryDao } from './dao/question.answer.category.dao';
import { QuestionCategoryDao } from './dao/question.category.dao';
import {
  CreateQuestionAnswerDto,
  UpdateQuestionAnswersDto,
} from './dto/create-question.answer.dto';
import { CreateQuestionAnswerMatrixDto } from './dto/create-question.answer.matrix.dto';
import {
  AssessmentType,
  QuestionStatus,
  QuestionType,
} from 'src/base/constants';
import { QuestionAnswerEntity } from './entities/question.answer.entity';
import { CreateQuestionAnswerCategoryDto } from './dto/create-question.answer.category.dto';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { QuestionCategoryEntity } from './entities/question.category.entity';

@Injectable()
export class QuestionService {
  constructor(
    private questionDao: QuestionDao,
    private assessmentDao: AssessmentDao,
    private questionAnswerDao: QuestionAnswerDao,
    private questionAnswerMatrixDao: QuestionAnswerMatrixDao,
    private questionAnswerCategoryDao: QuestionAnswerCategoryDao,
    private questionCategoryDao: QuestionCategoryDao,
  ) {}
  public async create(dto: CreateQuestionDto) {
    return await this.questionDao.create(dto);
  }

  public async updateAnswerCategory(dto: CreateQuestionAnswerCategoryDto) {
    return await this.questionAnswerCategoryDao.updateOne(dto);
  }

  public async deleteAnswerCategory(id: number) {
    return await this.questionAnswerCategoryDao.deleteOne(id);
  }

  public async updateChecker(category: number, type: number) {
    let questionCategory = await this.questionCategoryDao.findOne(category);
    if (!questionCategory) {
      throw new HttpException('Category not found', HttpStatus.BAD_REQUEST);
    }
    if (!type) {
      throw new HttpException('Type not found', HttpStatus.BAD_REQUEST);
    }
    return questionCategory;
  }

  public async update(questionCategory: number, assessment: number) {
    await this.questionCategoryDao.updatePoint(questionCategory);

    await this.assessmentDao.updatePoint(assessment);
  }

  public async updateAnswer(
    answers: CreateQuestionAllAnswerDto[],
    questionId: number,
    type: number,
  ) {
    for (const answer of answers) {
      const answerBody = {
        value: answer.answer?.value,
        point: answer.answer?.point,
        orderNumber: answer.answer?.orderNumber,
        file: answer.answer?.file,
        question: questionId,
        correct: answer.answer?.correct,
      };
      const category = answer.answer?.category;
      const cate =
        category == null || !category
          ? null
          : typeof category === 'number'
            ? category
            : (await this.questionAnswerCategoryDao.findByName(category)).id;
      const answerId =
        answer.answer?.id != null
          ? await this.questionAnswerDao.updateOne(answer.answer.id, {
              question: questionId,
              category: cate,
              ...answerBody,
            })
          : await this.questionAnswerDao.create({
              question: questionId,
              category: cate,
              ...answerBody,
            } as CreateQuestionAnswerDto);

      if (type == QuestionType.MATRIX) {
        for (const matrix of answer.matrix || []) {
          let { category, ...body } = matrix;
          const cate =
            category == null
              ? null
              : typeof category === 'number'
                ? category
                : (category as any).id;

          matrix.id == null
            ? await this.questionAnswerMatrixDao.create({
                ...(body as CreateQuestionAnswerMatrixDto),
                answer: answerId,
                question: questionId,
                category: cate,
              })
            : await this.questionAnswerMatrixDao.updateOne(matrix.id, {
                ...(body as CreateQuestionAnswerMatrixDto),
                answer: answerId,
                question: questionId,
                category: cate,
              });
        }
      }
    }
  }

  public async getPoint(type: number, answers: CreateQuestionAllAnswerDto[]) {
    const point =
      type === AssessmentType.TEST
        ? (answers.reduce(function (prev, current) {
            return prev && prev.answer.point > current.answer.point
              ? prev
              : current;
          })?.answer?.point ?? 0)
        : 0;
    return point;
  }

  public async createAll(dto: CreateQuestionAllDto, user: number) {
    try {
      const questionCategory = await this.updateChecker(dto.category, dto.type);
      const point =
        dto.question.point != 0 || dto.question.point
          ? dto.question.point
          : await this.getPoint(questionCategory.assessment.type, dto.answers);
      let questionId = await this.questionDao.create({
        ...dto.question,
        type: dto.type,
        status: QuestionStatus.ACTIVE,
        category: questionCategory.id,
        createdUser: user,
        point: point,
      });
      await this.updateAnswer(dto.answers, questionId, dto.type);
      this.update(questionCategory.id, questionCategory.assessment.id);
    } catch (error) {
      throw new HttpException(error?.message ?? error, HttpStatus.BAD_REQUEST);
    }
  }
  public async updateAll(dto: CreateQuestionAllDto, user: number) {
    try {
      const questionCategory = await this.updateChecker(dto.category, dto.type);
      const point =
        dto.question.point != 0 || dto.question.point
          ? dto.question.point
          : await this.getPoint(questionCategory.assessment.type, dto.answers);

      const questionId = await this.questionDao.updateOne(
        {
          ...dto.question,
          category: questionCategory.id,
          point: point,
        },
        dto.id,
        user,
      );
      await this.updateAnswer(dto.answers, questionId.id, dto.type);
      this.update(questionCategory.id, questionCategory.assessment.id);
    } catch (error) {
      throw new HttpException(error?.message ?? error, HttpStatus.BAD_REQUEST);
    }
  }
  public async deleteAnswer(dto: { data: number[] }, matrix: boolean) {
    try {
      matrix
        ? await this.questionAnswerDao.deleteOne(dto.data[0])
        : await Promise.all(
            dto.data.map(
              async (d) => await this.questionAnswerMatrixDao.deleteOne(d),
            ),
          );
    } catch (error) {
      return {
        success: false,
        message: error.message,
        status: error.status,
      };
    }
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
          false,
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
  public async findOneByAssessment(id: number, isAdmin: boolean) {
    const categories = await this.questionCategoryDao.findByAssessment(id);
    return await Promise.all(
      categories.map(async (category) => {
        let questions = await this.questionDao.findByCategory(
          null,
          false,
          category.id,
          [],
        );

        let res = await Promise.all(
          questions.map(async (question) => {
            let answers = await this.questionAnswerDao.findByQuestion(
              question.id,
              category.assessment.answerShuffle,
              isAdmin,
            );
            return {
              ...question,
              answers: answers,
            };
          }),
        );
        return {
          category: category,
          questions: res,
        };
      }),
    );
  }

  public async deleteAll() {
    await this.questionAnswerMatrixDao.clear();
    await this.questionAnswerDao.clear();
    await this.questionAnswerCategoryDao.clear();
    await this.questionDao.clear();
    await this.questionCategoryDao.clear();
  }

  public async deleteQuestionCategory(id: number) {
    return await this.questionCategoryDao.deleteOne(id);
  }

  public async deleteQuestion(id: number) {
    console.log(id);
    const res = await this.questionDao.findOne(id);
    console.log(res);
    const category = res.category.id;
    console.log(category);
    const assessment = await this.questionCategoryDao.findOne(category);

    await this.questionDao.deleteOne(id);
    await this.questionCategoryDao.updatePoint(category);
    await this.assessmentDao.updatePoint(assessment.id);
  }

  remove(id: number) {
    return `This action removes a #${id} question`;
  }

  public async testing(id: number) {
    return await this.questionAnswerMatrixDao.findAll();
  }
}
