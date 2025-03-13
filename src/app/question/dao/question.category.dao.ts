import { Injectable } from '@nestjs/common';
import { DataSource, In, MoreThan, Not, Repository } from 'typeorm';
import { QuestionCategoryEntity } from '../entities/question.category.entity';
import { CreateQuestionCategoryDto } from '../dto/create-question.category.dto';
import { UpdateQuestionCategoryDto } from '../dto/create-question.dto';
import { QuestionStatus } from 'src/base/constants';
import { UserAnswerDao } from 'src/app/user.answer/user.answer.dao';

@Injectable()
export class QuestionCategoryDao {
  private db: Repository<QuestionCategoryEntity>;
  constructor(
    private dataSource: DataSource,
  ) {
    this.db = this.dataSource.getRepository(QuestionCategoryEntity);
  }

  create = async (dto: CreateQuestionCategoryDto) => {
    const res = this.db.create({
      ...dto,
      assessment: {
        id: dto.assessment,
      },
      status: dto.status ?? QuestionStatus.ACTIVE,
    });
    await this.db.save(res);
    return res.id;
  };

  updateOne = async (dto: CreateQuestionCategoryDto, user: number) => {
    const { id, ...d } = dto;
    const res = await this.db.findOne({
      where: { id: id },
    });
    const body = {
      ...d,
      assessment: {
        id: dto.assessment,
      },
    };

    await this.db.save({ ...res, ...body, updatedUser: user });
    return res.id;
  };

  findAll = async () => {
    return await this.db.find({
      //   relations: [''],
    });
  };
  updatePoint = async (id: number) => {
    const res = await this.db.findOne({
      where: {
        id: id,
      },
      relations: ['questions'],
    });
    const point = res.questions?.[0].point * res.questionCount;
    await this.db.save({ ...res, totalPoint: point });
  };
  findOne = async (id: number) => {
    return await this.db.findOne({
      select: {
        updatedAt: false,
        createdAt: false,
        createdUser: false,
        status: false,
      },
      where: {
        id: id,
      },
      relations: ['assessment'],
    });
  };

  findByAssessment = async (assessment: number, id?: number) => {
    const category =
      id == undefined ? null : await this.db.findOne({ where: { id: id } });
    const res =
      category == null
        ? await this.db.find({
            where: {
              status: QuestionStatus.ACTIVE,
              assessment: { id: assessment },
            },
            order: {
              orderNumber: 'ASC',
            },

            relations: ['assessment', 'questions'],
          })
        : await this.db.find({
            where: {
              status: QuestionStatus.ACTIVE,
              assessment: { id: assessment },
              orderNumber: MoreThan(category.orderNumber),
            },
            order: {
              orderNumber: 'ASC',
            },
            relations: ['assessment', 'questions'],
          });

    return res;
  };

  findByName = async (name: string) => {
    const res = await this.db.findOne({
      where: {
        name: name,
      },
    });
    return res?.id;
  };
  clear = async () => {
    return await this.db.createQueryBuilder().delete().execute();
  };

  deleteOne = async (id: number) => {
    return await this.db
      .createQueryBuilder()
      .delete()
      .where({ id: id })
      .execute();
  };
}
