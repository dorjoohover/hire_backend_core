import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { LevelEntity } from '../entities/assessment.level.entity';
import { CreateAssessmentLevelDto } from '../dto/create.assessment.level.dto';

@Injectable()
export class AssessmentLevelDao {
  private db: Repository<LevelEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(LevelEntity);
  }

  create = async (dto: CreateAssessmentLevelDto) => {
    const res = this.db.create(dto);
    await this.db.save(res);
  };

  findAll = async () => {
    const res = await this.db.find({
      relations: ['assessments'],
    });
    console.log(res);
    return res;
  };

  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
    });
  };
}
