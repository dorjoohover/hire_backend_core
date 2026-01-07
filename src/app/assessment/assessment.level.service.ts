import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/base/base.service';
import { AssessmentLevelDao } from './dao/assessment.level.dao';
import { CreateAssessmentLevelDto } from './dto/create.assessment.level.dto';

@Injectable()
export class AssessmentLevelService extends BaseService {
  constructor(private dao: AssessmentLevelDao) {
    super();
  }
  public async create(dto: CreateAssessmentLevelDto) {
    return await this.dao.create(dto);
  }

  public async findAll() {
    console.log('asdf')
    return await this.dao.findAll();
  }

  public async findOne(id: number) {
    return await this.dao.findOne(id);
  }

  public async clear() {
    return await this.dao.clear();
  }
}
