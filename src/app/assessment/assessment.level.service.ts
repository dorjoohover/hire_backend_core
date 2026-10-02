import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/base/base.service';
import { AssessmentLevelDao } from './dao/assessment.level.dao';
import { CreateAssessmentLevelDto } from './dto/create.assessment.level.dto';
import { CacheService } from 'src/base/cache.service';

const TTL = 5 * 60_000;

@Injectable()
export class AssessmentLevelService extends BaseService {
  constructor(
    private dao: AssessmentLevelDao,
    private cache: CacheService,
  ) {
    super();
  }

  public async create(dto: CreateAssessmentLevelDto) {
    const result = await this.dao.create(dto);
    this.cache.del('assessment_levels');
    return result;
  }

  public async findAll() {
    return this.cache.getOrSet('assessment_levels', () => this.dao.findAll(), TTL);
  }

  public async findOne(id: number) {
    return await this.dao.findOne(id);
  }

  public async clear() {
    const result = await this.dao.clear();
    this.cache.del('assessment_levels');
    return result;
  }
}
