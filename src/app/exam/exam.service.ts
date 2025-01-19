import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamDao } from './dao/exam.dao';
import { ExamDetailDao } from './dao/exam.detail.dao';
import { BaseService } from 'src/base/base.service';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { QuestionService } from '../question/question.service';
import { QuestionCategoryDao } from '../question/dao/question.category.dao';
import { QuestionDao } from '../question/dao/question.dao';
import { waitForDebugger } from 'inspector';
import { QuestionEntity } from '../question/entities/question.entity';
import { QuestionCategoryEntity } from '../question/entities/question.category.entity';
import { QuestionAnswerEntity } from '../question/entities/question.answer.entity';
import { ExamEntity } from './entities/exam.entity';
import { FormuleService } from '../formule/formule.service';

@Injectable()
export class ExamService extends BaseService {
  constructor(
    private dao: ExamDao,
    private formule: FormuleService,
    private detailDao: ExamDetailDao,
    private questionService: QuestionService,
    private questionCategoryDao: QuestionCategoryDao,
  ) {
    super();
  }
  public async create(createExamDto: CreateExamDto) {
    const created = createExamDto.created ?? Math.round(Math.random() * 100);
    const code: number = Number(
      BigInt(
        `${Math.round(Math.random() * created * 100)}${Math.round(Date.now() * Math.random())}`,
      ),
    );
    await this.dao.create({ ...createExamDto, code: code });
    return code;
  }

  // onoo bujaats ywuulah
  public async calculateExamById(id: number) {
    const exam = await this.dao.findOne(id);
    const formule = exam.assessment.formule;
    if (formule) {
      const calculate = await this.formule.calculate(formule, exam.id);
      return calculate;
    }
  }

  // category questioncount der asuudaltai bga
  public async updateByCode(code: number, category?: number) {
    const res = await this.dao.findByCode(code);

    if (!res) throw new HttpException('Олдсонгүй.', HttpStatus.NOT_FOUND);
    if (res.endDate < new Date())
      throw new HttpException('Хугацаа дууссан байна.', HttpStatus.BAD_REQUEST);
    if (res.userEndDate != null)
      throw new HttpException('Эрх дууссан байна.', HttpStatus.BAD_REQUEST);
    // date false ued ehleh
    // date true ued duusah esvel urgeljluuleh
    const shuffle = res.assessment.questionShuffle;
    const answerShuffle = res.assessment.answerShuffle;
    let prevQuestions = [];
    let currentCategory = category;
    let allCategories = [];
    if (res.userStartDate == null && category === undefined) {
      const categories = await this.questionCategoryDao.findByAssessment(
        res.assessment.id,
      );
      currentCategory = categories[0].id;
      allCategories =
        categories.length <= 1
          ? []
          : categories
              .map((cate, i) => {
                if (i > 0) return cate.id;
              })
              .filter((f) => f != undefined);
      await this.dao.update(res.id, {
        ...res,
        userStartDate: new Date(),
      });
    }
    if (currentCategory) {
      prevQuestions = (await this.detailDao.findByExam(res.id)).map(
        (a) => a.id,
      );
      if (allCategories.length == 0)
        allCategories = await Promise.all(
          (
            await this.questionCategoryDao.findByAssessment(
              res.assessment.id,
              currentCategory,
            )
          ).map((a) => a.id),
        );
      const result = await this.getQuestions(
        shuffle,
        currentCategory,
        answerShuffle,
        prevQuestions,
      );
      await this.createDetail(
        result.questions,
        res.id,
        result.category,
        res.service.id,
      );
      return {
        questions: result.questions,
        category: result.category,
        categories: allCategories,
        assessment: res.assessment,
      };
    } else {
      await this.dao.update(res.id, {
        ...res,
        userEndDate: new Date(),
      });
    }
  }
  createDetail = async (
    questions: {
      question: QuestionEntity;
      answers: QuestionAnswerEntity[];
    }[],
    exam: number,
    category: QuestionCategoryEntity,
    service: number,
  ) => {
    return Promise.all(
      questions.map(async (question) => {
        await this.detailDao.create({
          exam: exam,
          pageNumber: 0,
          question: question.question.id,
          questionCategory: category.id,
          questionCategoryName: category.name,
          service: service,
        });
      }),
    );
  };
  public async getQuestions(
    shuffle: boolean,
    id: number,
    answerShuffle: boolean,
    questions: number[] = [],
  ) {
    const category = await this.questionCategoryDao.findOne(id);
    const q = await this.questionService.findForExam(
      category.questionCount,
      shuffle,
      id,
      answerShuffle,
      questions,
    );
    const res = {
      questions: q,
      category: category,
    };
    console.log('getQuestion Res:', res);
    return res;
  }

  public async findExamByService(service: number) {
    return await this.dao.findByService(service);
  }

  public async findByUser(id: number) {
    return await this.dao.findByUser
  }
  remove(id: number) {
    return `This action removes a #${id} exam`;
  }
}
