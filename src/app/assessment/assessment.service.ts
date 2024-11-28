import { Injectable } from '@nestjs/common';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentDao } from './dao/assessment.dao';
import { AssessmentLevelDao } from './dao/assessment.level.dao';
import { CreateAssessmentLevelDto } from './dto/create.assessment.level.dto';

@Injectable()
export class AssessmentService {
  constructor(
    private dao: AssessmentDao,
    private levelDao: AssessmentLevelDao,
  ) {}
  public async create(dto: CreateAssessmentDto, user: number) {
    return await this.dao.create({
      ...dto,
      createdUser: user,
    });
  }
  public async createLevel(dto: CreateAssessmentLevelDto) {
    this.levelDao.create(dto);
  }

  public async findAll() {
    const ass = await this.dao.findAll();
    const level = await this.levelDao.findAll();
    return {
      ass,
      level,
    };
  }

  public async findAllLevel() {}

  findOne(id: number) {
    return `This action returns a #${id} assessment`;
  }

  update(id: number, updateAssessmentDto: UpdateAssessmentDto) {
    return `This action updates a #${id} assessment`;
  }

  remove(id: number) {
    return `This action removes a #${id} assessment`;
  }

  public async clear() {
    await this.dao.clear();
    await this.levelDao.clear();
  }
}
