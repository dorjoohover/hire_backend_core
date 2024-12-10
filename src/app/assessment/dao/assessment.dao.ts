import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AssessmentEntity } from '../entities/assessment.entity';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';

@Injectable()
export class AssessmentDao {
  private db: Repository<AssessmentEntity>;
  constructor(private dataSource: DataSource) {
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
      relations: ['level'],
    });
  };

  findOne = async (id: number) => {
    const res = await this.db.findOne({
      where: {
        id: id,
      },
      relations: ['level', 'answerCategories', 'category'],
    });
    return res;
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
