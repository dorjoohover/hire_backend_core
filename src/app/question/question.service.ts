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
import { FormuleService } from '../formule/formule.service';

@Injectable()
export class QuestionService {
  constructor(
    private questionDao: QuestionDao,
    private assessmentDao: AssessmentDao,
    private questionAnswerDao: QuestionAnswerDao,
    private questionAnswerMatrixDao: QuestionAnswerMatrixDao,
    private questionAnswerCategoryDao: QuestionAnswerCategoryDao,
    private questionCategoryDao: QuestionCategoryDao,
    private formuleService: FormuleService,
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
        reverse: answer.answer.reverse,
        negative: answer.answer.negative,
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

  public async getPoint(
    question: CreateQuestionDto,
    answers: CreateQuestionAllAnswerDto[],
  ) {
    let point = 0;
    const type = question.type;
    // Хоосон жагсаалт (TEXT-ийн answers = [], хоосон matrix)-д Math.max() = -Infinity
    // болж асуулт / бүлэг / assessment-ийн оноо -Infinity болдог байсан → 0.
    const maxOf = (values: unknown[] | undefined) => {
      const nums = (values ?? []).map(Number).filter((n) => Number.isFinite(n));
      return nums.length ? Math.max(...nums) : 0;
    };
    if (type == QuestionType.CONSTANTSUM) return question.point ?? 0;
    if (type == QuestionType.MATRIX)
      for (const answer of answers ?? []) {
        point += maxOf(answer?.matrix?.map((matrix) => matrix.point));
      }
    else {
      point += maxOf(
        (answers ?? []).map((answer) =>
          answer.answer?.correct ? 1 : answer.answer?.point,
        ),
      );
    }
    return point;
  }

  public async updateAll(
    dto: CreateQuestionAllDto,
    user: number,
    create: boolean,
  ) {
    try {
      const questionCategory = await this.updateChecker(dto.category, dto.type);
      // ⚠️ getPoint нь question.type-аар MATRIX / CONSTANTSUM-ийг ялгадаг ч admin
      // `type`-ийг dto.question-д биш dto-д илгээдэг — өмнө нь дамжуулаагүйгээс MATRIX
      // асуултын дээд оноо мөрийн (questionAnswer) оноогоор = 0 болж, assessment-ийн
      // totalPoint 0 болж байв (hire_report-ийн квартил график 0 нийт оноотой үед гацдаг).
      const point =
        dto.question.point == null
          ? await this.getPoint({ ...dto.question, type: dto.type }, dto.answers)
          : dto.question.point == 0
            ? 1
            : dto.question.point;
      let questionId = create
        ? await this.questionDao.create({
            ...dto.question,
            type: dto.type,
            status: QuestionStatus.ACTIVE,
            category: questionCategory.id,
            createdUser: user,
            point: point,
          })
        : await this.questionDao.updateOne(
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

  // "Хувилах" (question/copy/:id) → AssessmentTransferService.copy() руу шилжсэн
  // (QuestionController шууд дууддаг). QuestionService нь 5 модульд дахин
  // provider болж бүртгэгддэг тул энд шинэ хамаарал нэмэхгүй.

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
    /** №3: exam code гэх мэт — өгвөл асуулт / хариултын shuffle тогтвортой (reload-д өөрчлөгдөхгүй). */
    seed?: string,
  ) {
    const questions = await this.questionDao.findByCategory(
      limit,
      shuffle,
      category,
      prevQuestions,
      seed ? `${seed}:c${category}` : undefined,
    );
    // Single batched query (mv_question_answer_full) instead of one
    // join-heavy query per question.
    const answersByQuestion = await this.questionAnswerDao.findByQuestionIds(
      questions.map((q) => q.id),
      answerShuffle,
      false,
      seed ? `${seed}:c${category}` : undefined,
    );
    return questions.map((question) => ({
      question: question,
      answers: answersByQuestion.get(question.id) ?? [],
    }));
  }

  public async findOne(id: number) {
    return await this.questionDao.findOne(id);
  }
  public async findOneByAssessment(id: number, isAdmin: boolean) {
    const categories = await this.questionCategoryDao.findByAssessment(id);

    // Fetch each category's questions, then batch-load ALL answers
    // (across every category) in a single mv_question_answer_full query
    // instead of one join-heavy query per question.
    const categoryQuestions = await Promise.all(
      categories.map((category) =>
        this.questionDao.findByCategory(null, false, category.id, []),
      ),
    );

    const allQuestionIds = categoryQuestions
      .flat()
      .map((q) => q.id)
      .filter((qid) => qid != null);

    // answerShuffle is the same per assessment, so just read it once.
    const answerShuffle = categories[0]?.assessment?.answerShuffle ?? false;
    const answersByQuestion = await this.questionAnswerDao.findByQuestionIds(
      allQuestionIds,
      answerShuffle,
      isAdmin,
    );

    return categories.map((category, idx) => ({
      category: category,
      questions: categoryQuestions[idx].map((question) => ({
        ...question,
        answers: answersByQuestion.get(question.id) ?? [],
      })),
    }));
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
    const res = await this.questionDao.findOne(id);
    if (!res) throw new HttpException('Асуулт олдсонгүй', HttpStatus.NOT_FOUND);
    const category = res.category?.id;
    const assessment = category
      ? (await this.questionCategoryDao.findOne(category))?.assessment
      : null;
    // Эхлээд устгаад ДАРАА нь оноог дахин бодно — өмнө нь эсрэг дарааллаар хийдэг байсан тул
    // устгасан асуулт бүлэг/assessment-ийн оноонд үлдэж, updatePoint унавал устгал огт
    // хийгддэггүй байв ("-Infinity" алдаа).
    await this.questionDao.deleteOne(id);
    if (category) await this.questionCategoryDao.updatePoint(category);
    if (assessment?.id) await this.assessmentDao.updatePoint(assessment.id);
  }

  remove(id: number) {
    return `This action removes a #${id} question`;
  }

  public async testing(id: number) {
    return await this.questionAnswerMatrixDao.findAll();
  }
}
