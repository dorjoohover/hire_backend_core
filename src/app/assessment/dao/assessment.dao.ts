import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AssessmentEntity } from '../entities/assessment.entity';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { QuestionDao } from 'src/app/question/dao/question.dao';

@Injectable()
export class AssessmentDao {
  private db: Repository<AssessmentEntity>;
  constructor(
    private dataSource: DataSource,
    private question: QuestionDao,
  ) {
    this.db = this.dataSource.getRepository(AssessmentEntity);
  }

  create = async (dto: CreateAssessmentDto) => {
    const { answerCategories, ...body } = dto;
    const res = this.db.create({
      ...body,

      category: {
        id: dto.category,
      },
      level: dto.level
        ? {
            id: dto.level,
          }
        : null,
    });
    await this.db.save(res);
    return res.id;
  };

  findAll = async () => {
    return await this.db.find({
      relations: ['level', 'category'],
    });
  };

  updatePoint = async (id: number) => {
    const res = await this.db.findOne({
      where: { id: id },
      relations: ['questionCategories'],
    });

    const point = res?.questionCategories?.reduce(
      (prev, r) => +prev + +r.totalPoint,
      0,
    );
    await this.db.save({ ...res, totalPoint: point });
  };

  findOne = async (id: number) => {
    const res = await this.db.findOne({
      where: {
        id: id,
      },
      relations: [
        'level',
        'answerCategories',
        'category',
        'questionCategories',
      ],
    });
    return res;
  };

  save = async (value: AssessmentEntity) => {
    await this.db.save(value);
  };

  countQuestionAssessment = async (ids: number[]) => {
    let res = await Promise.all(
      ids.map(async (id) => await this.question.countQuestionCategory(id)),
    );
    const response = res.reduce((a, b) => a + b, 0);
    return response;
  };
  deleteOne = async (id: number) => {
    return await this.db.delete(id);
  };
  update = async (id: number, dto: CreateAssessmentDto, user: number) => {
    const res = await this.db.findOne({
      where: { id },
    });
    const { answerCategories, ...d } = dto;
    const body = {
      ...d,
      category: {
        id: dto.category,
      },
      level: {
        id: dto.level,
      },
    };

    await this.db.save({ ...res, ...body, updatedUser: user });
  };
  clear = async () => {
    await this.db.createQueryBuilder().delete().execute();
  };
}
