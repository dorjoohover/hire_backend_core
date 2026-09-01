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
    if (type == QuestionType.CONSTANTSUM) return question.point ?? 0;
    if (type == QuestionType.MATRIX)
      for (const answer of answers) {
        point += Math.max(
          ...(answer?.matrix?.map((matrix) => matrix.point) ?? [0]),
        );
      }
    else {
      point += Math.max(
        ...(answers.map((answer) =>
          answer.answer.correct ? 1 : answer.answer.point,
        ) ?? [0]),
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
      const point =
        dto.question.point == null
          ? await this.getPoint(dto.question, dto.answers)
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

  public async copy(assessmentId: number, userId: number) {
    // 1) Эх өгөгдлөө бүтнээр нь авч ир (асуулт/хариулт/категориудтайгаа)
    const src = await this.assessmentDao.findOne(assessmentId);
    if (src.name.endsWith('copy')) throw new HttpException('Duplicated', 500);
    if (!src) throw new Error(`Assessment ${assessmentId} not found`);

    // 1.1) Тайлангийн тооцооллын томьёо (formule) байвал тусад нь хуулж,
    // шинэ FormulaEntity үүсгэнэ (эх болон шинэ assessment хоорондоо
    // хамааралгүй, тус тусдаа засварлагдах ёстой тул адилхан id-г заахгүй)
    let newFormuleId: number | undefined;
    if (src.formule) {
      const srcFormula = await this.formuleService.findOne(src.formule);
      if (srcFormula) {
        newFormuleId = await this.formuleService.create(
          {
            name: srcFormula.name,
            formula: srcFormula.formula,
            variables: srcFormula.variables,
            groupBy: srcFormula.groupBy,
            aggregations: srcFormula.aggregations,
            filters: srcFormula.filters,
            limit: srcFormula.limit,
            order: srcFormula.order,
            sort: srcFormula.sort,
          } as any,
          userId,
        );
      }
    }

    // 2) Шинэ assessment үүсгэнэ
    const newAssessment = await this.assessmentDao.create({
      createdUser: userId,
      level: src.level?.id ?? src.level, // id эсвэл obj
      category: src.category?.id,
      description: src.description,
      duration: src.duration,
      measure: src.measure,
      name: `${src.name} copy`,
      price: src.price,
      status: src.status,
      timeout: src.timeout,
      usage: src.usage,
      advice: src.advice,
      author: src.author,
      categoryShuffle: src.categoryShuffle,
      answerShuffle: src.answerShuffle,
      icons: src.icons,
      questionCount: src.questionCount,
      questionShuffle: src.questionShuffle,
      type: src.type,
      // "Ерөнхий мэдээлэл" таб-ын өмнө дутуу байсан талбарууд
      blockNavigation: src.blockNavigation,
      showResultOnComplete: src.showResultOnComplete,
      // "Тайлан" таб-ын өмнө дутуу байсан талбарууд
      report: src.report,
      exampleReport: src.exampleReport,
      formule: newFormuleId,
    } as any);

    const newAssessmentId = newAssessment;

    // const answerCategories: any[] = src.answerCategories ?? [];
    const questionCategories = src.questionCategories ?? [];

    // 3) Хариултын категорийн map (хуучин id -> шинэ id), parent-тай бол бас зохицуулна
    const catIdMap = new Map<number, number>();

    // 3.0) Асуултын категорийн map (хуучин questionCategory.id -> шинэ id).
    // Доор qc давталтад бөглөгдөж, төгсгөлд assessment_formulas-ыг (HADS/
    // DASS-21/Тархины ачаалал/WHOQOL-BREF шиг олон дэд-оноотой сорилуудын
    // тооцооллын томьёо) шинэ category ID-үүд рүү зөв заалгаж хуулахад
    // хэрэглэгдэнэ (эс тэгвэл эдгээр сорил duplicate хийсний дараа
    // "асуулт алгассан" гэж тайланд гардаг байсан).
    const qCatIdMap = new Map<number, number>();

    const ensureAnswerCategory = async (
      oldCat: any | null | undefined,
    ): Promise<number | null> => {
      if (!oldCat) return null;
      const oldId = oldCat.id ?? oldCat;
      if (catIdMap.has(oldId)) return catIdMap.get(oldId)!;

      // эхлээд parent-ийг үүсгэнэ (байвал)
      const newParentId = await ensureAnswerCategory(oldCat.parent);

      const created = await this.questionAnswerCategoryDao.create({
        name: oldCat.name,
        parent: newParentId, // шинэ parent id
        assessment: newAssessmentId, // ШИНЭ assessment-р холбоно
        description: oldCat.description ?? null,
      });

      const newId = created.id;
      catIdMap.set(oldId, newId);
      return newId;
    };

    // 3.1 Хэрвээ бүх категориудыг эхнээс нь нэг мөсөн үүсгэхийг хүсвэл (сонголт)
    // for (const c of answerCategories) await ensureAnswerCategory(c);

    // 4) Асуултын категорийг хуулж, асуулт/хариулт/матрицыг нэг бүрчлэн үүсгэнэ
    //
    // ⚠️ АНХААРАХ ЗҮЙЛ (id-г хасахаас ГАДНА): `qc`/`question`/`answer` нь
    // TypeORM-ээс relations-тайгаар (`answers`, `matrix`, `answers.category`,
    // `answers.matrix`) ачаалагдсан ЭХ мөрүүд тул `{...qcRest}` /
    // `{...questionRest}` / `{...answerRest}` гэж spread хийхэд `id`-г
    // хассан ч дараах OneToMany relation массивууд бүтнээрээ (ЭХ
    // мөрүүдийн бодит `id`-тай хамт) дотор нь үлдэж DTO-руу орсоор
    // байсан юм:
    //   - question.answers, question.matrix
    //   - answer.matrix
    // TypeORM `save()`-д ийм массив өгвол, `cascade: true` тохируулаагүй
    // ч гэсэн OneToMany талын хүүхэд мөрүүдийн foreign key-г шинээр
    // үүсгэсэн эцэг рүү УДИРДАЖ ШИНЭЧЛЭХ (`UPDATE ... SET "questionId" =
    // <шинэ id>`) зан гаргадаг нь локал Postgres дээр SQL лог-оор
    // баталгаажсан. Үүний улмаас хуулбарлах үед ЭХ questionAnswer/
    // questionAnswerMatrix мөрүүд шинэ асуулт/хариулт руу "хулгайлагдаж",
    // эх асуулт хариултгүй үлдэж, шинэ асуулт давхар хариулттай болж
    // байсан нь "duplicate үүсгэхэд хариултууд үүсэхгүй байна" гэсэн
    // алдааны жинхэнэ шалтгаан байв.
    //
    // Тиймээс доор `...spread` ашиглахгүйгээр зөвхөн шаардлагатай
    // СКАЛЯР талбаруудыг тодорхой жагсаан (whitelist) дамжуулж, ямар ч
    // relation объект/массив алдагдаж орохгүй байхаар бичив.
    for (const qc of questionCategories) {
      // эхлээд qc-т харьяалагдах асуултуудыг авчир
      const questions = await this.questionDao.findQuestions(qc.id);

      // шинэ question category (зөвхөн скаляр талбарууд)
      const newQCat = await this.questionCategoryDao.create({
        name: qc.name,
        value: qc.value,
        duration: qc.duration,
        orderNumber: qc.orderNumber,
        status: qc.status,
        url: qc.url,
        sliced: qc.sliced,
        createdUser: userId,
        questionCount: questions.length,
        assessment: newAssessmentId,
      });
      const newQCatId = newQCat;
      qCatIdMap.set(qc.id, newQCatId);

      // асуулт бүр
      for (const question of questions ?? []) {
        const newQ = await this.questionDao.create({
          name: question.name,
          type: question.type,
          level: question.level,
          status: question.status,
          minValue: question.minValue,
          maxValue: question.maxValue,
          slider: question.slider,
          point: question.point,
          orderNumber: question.orderNumber,
          file: question.file,
          required: question.required,
          category: newQCatId,
          createdUser: userId,
        });
        const newQId = newQ.id;

        const answers = question.answers ?? [];
        for (const answer of answers) {
          // хариултын category-г map-даж (parent chain-тэй бол parent-ийг нь эхлээд үүсгэнэ)
          const newCatId = await ensureAnswerCategory(answer.category);

          const newA = await this.questionAnswerDao.create({
            value: answer.value,
            point: answer.point,
            orderNumber: answer.orderNumber,
            file: answer.file,
            correct: answer.correct,
            reverse: answer.reverse,
            negative: answer.negative,
            category: newCatId,
            question: newQId,
          });
          const newAId = newA;

          const matrix = answer.matrix ?? [];
          for (const mrtx of matrix) {
            await this.questionAnswerMatrixDao.create({
              value: mrtx.value,
              point: mrtx.point,
              orderNumber: mrtx.orderNumber,
              answer: newAId,
              category: newCatId,
              question: newQId,
            });
          }
        }
      }
    }

    // 5) Тайлангийн олон-дэд-ангилалт томьёог (assessment_formulas —
    // HADS/DASS-21/Тархины хэт ачааллыг үнэлэх/WHOQOL-BREF шиг олон дэд
    // оноотой сорилуудын тооцоолол яг эдгээр мөрөөр удирддаг) шинэ
    // assessment рүү, дээрх qCatIdMap-аар шинэ category ID-үүд рүү дахин
    // холбож хуулна. Үүнийг өмнө нь хийдэггүй байсан тул "Хуулах" товчоор
    // duplicate хийсэн ийм төрлийн сорилын тайланд эдгээр дэд сорил "Оноо
    // бүртгэгдээгүй (асуулт алгассан)" гэж гардаг байсан — FormuleDao-ийн
    // getFormula() шинэ assessment дээр ямар ч assessment_formulas мөр
    // олдоогүй тул хоосон буцаадаг байсан нь жинхэнэ шалтгаан.
    await this.formuleService.copyAssessmentFormulas(
      assessmentId,
      newAssessmentId,
      qCatIdMap,
      userId,
    );

    return newAssessment;
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
    // Single batched query (mv_question_answer_full) instead of one
    // join-heavy query per question.
    const answersByQuestion = await this.questionAnswerDao.findByQuestionIds(
      questions.map((q) => q.id),
      answerShuffle,
      false,
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
    const category = res.category.id;
    const assessment = (await this.questionCategoryDao.findOne(category))
      .assessment;
    await this.questionCategoryDao.updatePoint(category);
    await this.assessmentDao.updatePoint(assessment.id);
    await this.questionDao.deleteOne(id);
  }

  remove(id: number) {
    return `This action removes a #${id} question`;
  }

  public async testing(id: number) {
    return await this.questionAnswerMatrixDao.findAll();
  }
}
