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
import { UserAnswerDao } from '../user.answer/user.answer.dao';
import { ImageReport } from './reports/exam.pdf';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import PdfPrinter from 'pdfmake';
import { PdfService } from './pdf.service';
import { VisualizationService } from './visualization.service';
import path from 'path';
import fs from 'fs';

const colors = {
  black: '#231F20',
  orange: '#F36421',
  red: '#ED1C45',
};
@Injectable()
export class ExamService extends BaseService {
  constructor(
    private dao: ExamDao,
    private formule: FormuleService,
    private detailDao: ExamDetailDao,
    private pdfService: PdfService,
    private questionService: QuestionService,
    private userAnswer: UserAnswerDao,
    private visualizationService: VisualizationService,
    private questionCategoryDao: QuestionCategoryDao,
  ) {
    super();
  }
  path(p: string) {
    const imagePath = path.join(__dirname, `../../../src/assets/${p}.png`);
    return fs.readFileSync(imagePath);
  }
  async getPdf(id: number) {
    // const usersData = await this.findAllUsersOfOrg(orgId);

    await this.pdfService.addFont();
    const { width, height, xMargin } = await this.pdfService.getFullSize();
    const chart = await this.visualizationService.createChart();

    await this.pdfService.addImage(this.path('logo'), {
      x: 0,
      y: 30,
      width: 70,
      height: 20,
    });
    await this.pdfService.addImage(this.path('top'), {
      width: width + 3 * xMargin,
      height: 100,
      y: -20,
      x: -xMargin,
    });
    // await this.pdfService.addNewLine(); // Leave an empty Line
    this.pdfService.addText(`Шалгуулагч`);
    await this.pdfService.addText(`SubHeading`);
    await this.pdfService.addNewLine();

    //one page left empty for TOC
    // await this.pdfService.addNewPage();
    // await this.pdfService.addNewPage();
    // await this.pdfService.addGenericTable(usersData, {
    //   ignoreFields: ['password', 'otp', 'otpCreatedAt', 'lastPasswordUpdateAt'],
    //   tableName: 'Users Table',
    //   addToIndex: true, //add to TOC
    //   theme: 'grid',
    // });

    // //changed ignoreFields.Table resizes automatically. Look in pdf images
    // await this.pdfService.addGenericTable(usersData, {
    //   ignoreFields: [
    //     'password',
    //     'otp',
    //     'otpCreatedAt',
    //     'lastPasswordUpdateAt',
    //     'createdAt',
    //   ],
    //   tableName: 'Users2 Table',
    //   addToIndex: true, // add to TOC
    //   theme: 'grid',
    // });

    // await this.pdfService.addNewPage();
    await this.pdfService.addText(`TRAILING PAGE`, {
      align: 'center',
    });
    this.pdfService.addImage(chart, { width: width, height: 300 });
    return await this.pdfService.render();
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
    const exam = await this.dao.findByCode(id);
    const formule = exam.assessment.formule;
    if (formule) {
      const calculate = await this.formule.calculate(formule, exam.id);
      const value = calculate[0].point / exam.assessment.totalPoint;
      return {
        calculate,
        value,
      };
    }
  }

  public async updateExamByCode(
    code: number,
    dto: { email: string; firstname: string; lastname: string; phone: string },
  ) {
    await this.dao.update(code, dto);
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
    const answers = await this.userAnswer.findByCode(code);
    console.log(res);
    if (category == -1) {
      await this.dao.update(res.id, {
        ...res,
        userEndDate: new Date(),
      });
      return;
    }
    const shuffle = res.assessment.questionShuffle;
    const answerShuffle = res.assessment.answerShuffle;
    let prevQuestions = (await this.detailDao.findByExam(res.id)).map(
      (a) => a.id,
    );
    let currentCategory = category;
    let allCategories = [];

    const categories = await this.questionCategoryDao.findByAssessment(
      res.assessment.id,
    );
    if (res.userStartDate == null && category === undefined) {
      currentCategory = categories[0].id;
      await this.dao.update(res.id, {
        ...res,
        userStartDate: new Date(),
      });
      allCategories =
        categories.length <= 1
          ? []
          : categories
              .map((cate, i) => {
                if (i > 0) return cate.id;
              })
              .filter((f) => f != undefined);
    }

    if (
      res.userStartDate != null &&
      category == undefined &&
      res.userEndDate == null
    ) {
      allCategories =
        categories.length <= 1
          ? []
          : categories
              .map((cate, i) => {
                if (i > 0) return cate.id;
              })
              .filter((f) => f != undefined);
      currentCategory = categories[0].id;
    }
    if (answers.length > 0) {
      const answeredCategory = answers[answers.length - 1].questionCategory.id;
      const i = allCategories.indexOf(answeredCategory);
      const predictCategory = allCategories[i + 1];
      if (currentCategory < predictCategory) {
        currentCategory = predictCategory;
        allCategories = allCategories.slice(i + 2);
      }
    }

    if (currentCategory) {
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
    // console.log('getQuestion Res:', res);
    return res;
  }

  public async findExamByService(service: number) {
    return await this.dao.findByService(service);
  }

  public async findByUser(serviceId: number[], id: number) {
    return await this.dao.findByUser(serviceId, id);
  }
  remove(id: number) {
    return `This action removes a #${id} exam`;
  }
}
