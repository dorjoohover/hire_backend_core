import { Injectable } from '@nestjs/common';
import { DataSource, In, MoreThan, Not, Repository } from 'typeorm';
import { QuestionCategoryEntity } from '../entities/question.category.entity';
import { CreateQuestionCategoryDto } from '../dto/create-question.category.dto';
import { UpdateQuestionCategoryDto } from '../dto/create-question.dto';
import { QuestionStatus } from 'src/base/constants';

@Injectable()
export class QuestionCategoryDao {
  private db: Repository<QuestionCategoryEntity>;
  constructor(private dataSource: DataSource) {
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

  findAll = async () => {
    return await this.db.find({
      //   relations: [''],
    });
  };

  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
    });
  };
  findByAssessment = async (assessment: number, id?: number) => {
    const category =
      id == undefined ? null : await this.db.findOne({ where: { id: id } });
    return category == null
      ? await this.db.find({
          where: {
            status: QuestionStatus.ACTIVE,
            assessment: { id: assessment },
          },
          order: {
            orderNumber: 'ASC',
          },
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
        });
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
}
