import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserAnswerEntity } from './entities/user.answer.entity';
import { CreateUserAnswerDto } from './dto/create-user.answer.dto';
import { ReportType } from 'src/base/constants';

@Injectable()
export class UserAnswerDao {
  private db: Repository<UserAnswerEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(UserAnswerEntity);
  }
  query = async (q: string) => {
    const res = await this.db.find({
      where: {
        exam: {
          id: 225,
        },
      },
      relations: ['answerCategory', 'answer', 'matrix'],
    });
    return await this.db.query(q);
  };
  create = async (dto: CreateUserAnswerDto) => {
    try {
      let res = dto.matrix
        ? await this.db.findOne({
            where: {
              question: { id: dto.question },
              code: dto.code,
              matrix: {
                id: dto.matrix,
              },
            },
            relations: ['answer'],
          })
        : await this.db.findOne({
            where: {
              question: { id: dto.question },
              code: dto.code,
              answer: {
                id: dto.answer,
              },
            },
          });
      const body = {
        ...dto,
        exam: { id: +dto.exam },
        endDate: new Date(),
        answer: { id: dto.answer ? dto.answer : null },

        matrix: dto.matrix ? { id: +dto.matrix } : null,
        question: { id: +dto.question },
        answerCategory: dto.answerCategory ? { id: +dto.answerCategory } : null,
        questionCategory: { id: +dto.questionCategory },
      };
      if (res) {
        const point: number = (() => {
          const p = Number(dto.point);
          return isNaN(p) ? 0 : p;
        })();
        console.log(body.question, point);
        await this.db.save({ ...res, point });
      } else {
        res = this.db.create(body);
        await this.db.save(res);
      }
      return res.id;
    } catch (error) {
      console.log('err', error);
      return undefined;
    }
  };
  insert = async (rows: CreateUserAnswerDto[]) => {
    if (!rows.length) return;

    const entities = rows.map((dto) => {
      const {
        exam,
        answer,
        matrix,
        question,
        answerCategory,
        questionCategory,
        ...rest
      } = dto;
      return {
        exam: { id: +exam },
        endDate: new Date(),
        answer: answer ? { id: +answer } : null,
        matrix: matrix ? { id: +matrix } : null,
        question: { id: +question },
        answerCategory: answerCategory ? { id: +answerCategory } : null,
        questionCategory: { id: +questionCategory },
        point: rest.point ?? 0,
        ip: rest.ip,
        device: rest.device,
        code: rest.code,
        value: rest.value ?? null,
      };
    });

    await this.db
      .createQueryBuilder()
      .insert()
      .into(UserAnswerEntity)
      .values(entities)
      .execute();
  };

  partialCalculator = async (
    id: number,
    type: number,
  ): Promise<
    {
      categoryName: string;
      point: number;
      totalPoint: number;
    }[]
  > => {
    const res = this.db
      .createQueryBuilder('userAnswer')
      .select('category.name', 'categoryName')
      .addSelect('category.totalPoint', 'totalPoint')
      .addSelect(
        `${type === ReportType.CORRECTCOUNT ? 'COUNT' : 'SUM'}(userAnswer.point)`,
        'point',
      )
      .innerJoin(
        'questionCategory',
        'category',
        'category.id = "userAnswer"."questionCategoryId"',
      )
      .where('"userAnswer"."code" = :id', { id });

    if (type === ReportType.CORRECTCOUNT) {
      res.andWhere('"userAnswer"."correct" = true');
    }

    return await res
      .groupBy('category.name')
      .addGroupBy('category.totalPoint')
      .getRawMany();
  };

  findAll = async () => {
    return await this.db.find({});
  };

  findByCode = async (code: string, id?: number) => {
    if (id != 0 && id) {
      return await this.db.find({
        where: {
          code: code,
          questionCategory: {
            id: id,
          },
        },
        relations: ['question', 'answer', 'matrix'],
      });
    }
    return await this.db.find({
      where: {
        code: code,
      },
      relations: ['question', 'answer', 'matrix', 'questionCategory'],
      order: {
        questionCategory: {
          id: 'ASC',
        },
      },
    });
  };

  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
    });
  };
  findByAnswerId = async (id: number, code: string) => {
    return await this.db.findOne({
      where: {
        answer: {
          id,
        },
        code,
      },
    });
  };
  findByAnswerMatrixId = async (id: number, code: string) => {
    return await this.db.findOne({
      where: {
        code: code,
        matrix: {
          id,
        },
      },
    });
  };
  findByQuestionCategory = async (id: number, code: string) => {
    return await this.db.findOne({
      where: {
        questionCategory: {
          id,
        },
        code,
      },
    });
  };
  findByExam = async (exam: number) => {
    return await this.db.find({
      where: {
        exam: {
          id: exam,
        },
      },
    });
  };

  updateOne = async (id: number, dto: CreateUserAnswerDto) => {
    let res = await this.findOne(id);

    res = await this.db.save({
      id: res.id,
      answer: { id: dto.answer },
      matrix: { id: dto.matrix },
      flag: dto.flag,
      device: dto.device,
      ip: dto.ip,
      point: dto.point,
    });
    return res.id;
  };

  // dynamic = async () => {
  //   await this.db.createQueryBuilder('', {

  //   }).addGroupBy()
  // }

  deleteOne = async (id: number) => {
    return await this.db
      .createQueryBuilder()
      .where({
        id: id,
      })
      .delete()
      .execute();
  };
}
