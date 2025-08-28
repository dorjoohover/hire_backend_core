import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  CalculateUserAnswerDto,
  CreateUserAnswerDto,
  UserAnswerDtoList,
} from './dto/create-user.answer.dto';
import { UpdateUserAnswerDto } from './dto/update-user.answer.dto';
import { UserAnswerDao } from './user.answer.dao';
import { QuestionAnswerDao } from '../question/dao/question.answer.dao';
import { QuestionAnswerMatrixDao } from '../question/dao/question.answer.matrix.dao';
import { QuestionDao } from '../question/dao/question.dao';
import { BaseService } from 'src/base/base.service';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { ExamDao } from '../exam/dao/exam.dao';
import { QuestionAnswerCategoryDao } from '../question/dao/question.answer.category.dao';
import { QuestionAnswerEntity } from '../question/entities/question.answer.entity';
import { ExamService } from '../exam/exam.service';
import { MailerService } from '@nestjs-modules/mailer';
import { UserDao } from '../user/user.dao';
import { BarimtService } from '../barimt/barimt.service';

@Injectable()
export class UserAnswerService extends BaseService {
  constructor(
    private dao: UserAnswerDao,
    private questionDao: QuestionDao,
    private examDao: ExamDao,
    private mailService: MailerService,
    private examService: ExamService,
    private questionAnswerDao: QuestionAnswerDao,
    private questionAnswerMatrixDao: QuestionAnswerMatrixDao,
  ) {
    super();
  }
  public async create(
    dto: UserAnswerDtoList,
    ip: string,
    device: string,
    user?: any,
  ) {
    const res = [];
    const message = (msg: string) =>
      new HttpException(msg, HttpStatus.BAD_REQUEST);
    console.log(dto);
    try {
      // Validate input
      if (!dto.data?.length) throw message('Асуултууд ирсэнгүй');

      const exam = await this.examDao.findByCodeOnly(dto.data[0].code);
      console.log(exam);
      if (!exam) throw message('Тест олдсонгүй');

      for (const d of dto.data) {
        if (!d.question) throw message('Асуулт байхгүй');
        if (!d.questionCategory) throw message('Асуултын ангилал байхгүй');

        const query = `select "minValue", "maxValue"  from question where id = ${d.question}`;
        const question = await this.questionDao.query(query);
        if (!question) throw message('Асуулт олдсонгүй');

        // No answer case
        if (!d.answers || d.answers.length === 0) {
          const body: CreateUserAnswerDto = {
            ...d,
            startDate: dto.startDate,
            answerCategory: null,
            minPoint: question.minValue,
            maxPoint: question.maxValue,
            point: null,
            answer: null,
            correct: false,
            matrix: null,
            ip,
            exam: exam.id,
            device,
          };
          const r = await this.dao.create(body);
          res.push(r);
          continue;
        }

        // Multiple answers
        const code = dto.data[0].code;

        const answers = d.answers;
        for (const answer of answers) {
          const result = answer.matrix
            ? await this.dao.findByAnswerMatrixId(answer.matrix, code)
            : await this.dao.findByAnswerId(answer.answer, code);
          if (result) continue;
          let answerCategory = answer.matrix
            ? await this.questionAnswerMatrixDao.query(
                `select   "categoryId" from "questionAnswerMatrix" where id = ${answer.matrix}`,
              )
            : await this.questionAnswerDao.query(
                `select reverse,correct,  "categoryId" from "questionAnswer" where id = ${answer.answer}`,
              );
          answerCategory = answerCategory[0];
          let point: number;
          if (
            !answer.matrix &&
            (answerCategory as QuestionAnswerEntity)?.reverse
          ) {
            point =
              Number(question?.maxValue ?? question[0]?.maxValue ?? 0) -
              Number(answer.point ?? 0) +
              Number(question?.minValue ?? question[0]?.minValue ?? 0);
            console.log('if', point);
          } else {
            let p;

            if (answer.point != null) {
              p = answer.point;
            } else if (answer.matrix) {
              const matrixResult = await this.questionAnswerMatrixDao.query(
                `SELECT point FROM "questionAnswerMatrix" WHERE id = ${answer.matrix}`,
              );
              p = matrixResult[0]?.point;
            } else {
              const answerResult = await this.questionAnswerDao.query(
                `SELECT point FROM "questionAnswer" WHERE id = ${answer.answer}`,
              );
              p = answerResult[0]?.point;
            }

            console.log(p);

            point = typeof p === 'number' ? +p : +p;
          }

          const body: CreateUserAnswerDto = {
            ...d,
            startDate: dto.startDate,
            answerCategory: answerCategory?.categoryId ?? null,
            minPoint: question.minValue,
            maxPoint: question.maxValue,
            point,
            answer: answer.answer,
            correct: answer.matrix
              ? null
              : ((answerCategory as QuestionAnswerEntity)?.correct ?? null),
            matrix: answer.matrix,
            value: answer.value,
            ip,
            exam: exam.id,
            device,
          };
          const r = await this.dao.create(body);
          res.push(r);
        }
      }

      // Тест дууссан эсэх
      console.log(dto.end);
      if (dto.end) {
        const code = dto.data[0].code;
        this.endExam(
          code,
          user.email,
          exam.assessment?.id ?? exam.assessment[0].id,
          exam.assessment?.name ?? exam.assessment[0].name,
        );
      }

      return res;
    } catch (error) {
      console.error('❌ Хэрэглэгчийн хариулт бүртгэх үед алдаа:', error);
      throw error instanceof HttpException
        ? error
        : new HttpException(
            'Дотоод серверийн алдаа',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
    }
  }

  private async endExam(code: number, email: string, id: number, name: string) {
    const response = await this.examService.endExam(code, true);

    if (response?.visible) {
      await this.mailService.sendMail({
        to: email,
        subject: 'Таны тайлан бэлэн боллоо',
        html: this.generateEmailTemplate(id, name, code),
      });
    }

    return { visible: response?.visible };
  }
  private generateEmailTemplate(
    id: number,
    name: string,
    code: number,
  ): string {
    return `
 <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Таны тайлан бэлэн боллоо</title>
              <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
              <style>
              body, h1, h2, h3, p, a, div {
                font-family: 'Montserrat', sans-serif;
              }
            </style>
            </head>
            <body style="margin: 0; padding: 0; min-width: 100%; margin-top: 10px; font-family: 'Montserrat', sans-serif;">
              <center style="width: 100%; table-layout: fixed; padding-bottom: 20px;">
                <div style="max-width: 600px; margin: 0 auto;">
                  <table width="600" cellspacing="0" cellpadding="0" border="0" align="center">
                  <tr>
                  <td>
                  
                  <table align="center" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-spacing: 0; border-collapse: collapse;">
                    <tr>
                      <td style="background: linear-gradient(135deg, #ff5000 0%, #ed1c45 100%); padding: 20px 40px; text-align: left;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width: 80%; text-align: left; vertical-align: middle;">
            <img src="https://raw.githubusercontent.com/usukhbaya12/images/refs/heads/main/hire-2-white.png" alt="Hire.mn Logo" width="120" height="auto" style="display: block; border: 0;">
              </td>
        <td style="width: 20%; text-align: right; vertical-align: middle;">
                <table cellspacing="0" cellpadding="0" border="0" align="right" style="display: inline-block;">
                  <tr>
                    <td style="border-radius: 99px; background: linear-gradient(135deg, #ffffff 20%, #ffffff 21%); mso-padding-alt: 10px 16px; text-align: center;">
                      <a href="https://hire.mn" 
                        style="padding: 10px 16px; border-radius: 4px; 
                                color: #ff5000 !important; 
                                font-family: 'Montserrat', Arial, sans-serif; 
                                font-size: 14px; font-weight: 600; 
                                text-decoration: none; 
                                display: inline-block;
                                mso-line-height-rule: exactly;
                                line-height: 1.2;
                                text-align: center;">
                        Зочлох
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
                        </td>
                    </tr>
                    
                    <tr>
                      <td style="background-color:rgb(250, 250, 250); padding: 20px 40px 10px 40px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; color: #333333;">
                              Өдрийн мэнд,
                            </td>
                          </tr>
                          <tr>
                            <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                              <p style="margin: 0 0 15px 0;">
                                <br/>Таны онлайн тест, үнэлгээний Hire.mn платформ дээр өгсөн <a href=https://hire.mn/test/${id} style="color: #ff5000; font-weight: 700; text-decoration: none;">${name}</a> тестийн тайлан бэлэн боллоо. Та тайлангаа <a style="color: #ff5000; text-decoration: none;" href=https://srv666826.hstgr.cloud/api/v1/file/report-${code}.pdf>энд дарж</a> татаж авна уу.
                              </p>
                            </td>
                          </tr>
                          <tr>
                          <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                            <p style="margin: 0 0 15px 0;">
                              Тайлангийн электрон хувилбарыг Hire.mn сайт руу нэвтэрч, “Өгсөн тестүүд” булангаас харах боломжтой. Тайлантай холбоотой асууж тодруулах зүйл гарвал ажлын өдрүүдэд 09-18 цагийн хооронд <a href="mailto:info@hire.mn" style="color: #ff5000; text-decoration: none;">info@hire.mn</a> хаягаар эсвэл <a href="tel:976-9909 9371" style="color: #ff5000; text-decoration: none;">976-9909 9371</a> утсаар холбогдоно уу.
                            </p>
                          </td>
                        </tr>
                          <tr>
                            <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                              <p style="margin: 0 0 15px 0;">
                                Хүндэтгэсэн,<br/>Hire.mn
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <tr>
                      <td style="background-color: #f5f5f5; padding: 20px; text-align: center; font-family: 'Montserrat', sans-serif; font-size: 12px; color: #777777; border-top: 1px solid #eeeeee;">
                        <p style="margin: 0; line-height: 1.5;">Шуудангийн хаяг: Аксиом Инк ХХК, Улаанбаатар хот, Баянзүрх дүүрэг, 1-р хороо<br>Энхтайвны өргөн чөлөө-5, СЭЗИС, Б байр, 7-р давхар, 13381, Ш/Н: Улаанбаатар-49</p><br/>
                        <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} Аксиом Инк.</p>
                      </td>
                    </tr>
                  </table>
                  
                  </td>
                  </tr>
                  </table>
                </div>
              </center>
            </body>
            </html>
   
  `;
  }
  public async calculate(dto: CalculateUserAnswerDto) {
    // const exam = await this.examDao.findOne(id)
    // const dto = JSON.parse(exam.assessment.function) as CalculateUserAnswerDto
    // tests der hj bga
    // if(dto.answerCategory)
  }

  public async findAll() {
    return await this.dao.findAll();
  }

  public async findByCode(code: number) {
    return await this.dao.findByCode(code, 0);
  }
  public async findOne(id: number, code: number) {
    let res = await this.dao.findByCode(code, id);
    const formatted = await Promise.all(
      res.map((r) => {
        const key = r.answer?.id;
        return {
          answer: key,
          matrix: r.matrix != null ? r.matrix.id : null,
          type: r.question.type,
          flag: r.flag,
          point: r.point,
          question: r.question.id,
        };
      }),
    );

    const groupedByQuestionAndKey = formatted.reduce((acc, item) => {
      const questionId = item.question;

      if (!acc[questionId]) {
        acc[questionId] = {};
      }

      const key = item.answer ?? item.matrix;
      if (key == undefined) {
        acc[questionId] = {};
      } else {
        if (!acc[questionId][key]) {
          acc[questionId][key] = [];
        }

        acc[questionId][key].push(item);
      }

      return acc;
    }, {});
    Object.keys(groupedByQuestionAndKey).forEach((questionId) => {
      const answers = groupedByQuestionAndKey[questionId];

      Object.keys(answers).forEach((answerId) => {
        const uniqueAnswers = Array.from(
          new Set(answers[answerId].map((item) => JSON.stringify(item))),
        ).map((item) => JSON.parse(`${item}`));

        answers[answerId] = uniqueAnswers; // Replace with unique objects
      });
    });

    return {
      data: groupedByQuestionAndKey,
      startDate: res?.[0]?.startDate,
      endDate: res?.[0]?.endDate,
    };
  }

  update(id: number, updateUserAnswerDto: UpdateUserAnswerDto) {
    return `This action updates a #${id} userAnswer`;
  }
}
