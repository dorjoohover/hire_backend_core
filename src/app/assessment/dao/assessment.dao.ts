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
    const res = this.db.create({
      ...dto,
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
  };

  findAll = async () => {
    return await this.db.find({
      relations: ['level'],
    });
  };

  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
      relations: ['level'],
    });
  };
}
