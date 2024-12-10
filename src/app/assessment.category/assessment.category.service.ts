import { Injectable } from '@nestjs/common';
import { CreateAssessmentCategoryDto } from './dto/create-assessment.category.dto';
import { UpdateAssessmentCategoryDto } from './dto/update-assessment.category.dto';
import { DataSource, Repository } from 'typeorm';
import { AssessmentCategoryEntity } from './entities/assessment.category.entity';
import { BaseService } from 'src/base/base.service';
import { UserService } from '../user/user.service';

@Injectable()
export class AssessmentCategoryService extends BaseService {
  private db: Repository<AssessmentCategoryEntity>;

  constructor(
    private dataSource: DataSource,
    private userService: UserService,
  ) {
    super();
    this.db = this.dataSource.getRepository(AssessmentCategoryEntity);
  }
  public async create(dto: CreateAssessmentCategoryDto, user: number) {
    let res = this.db.create({
      parent: {
        id: dto.parent,
      },
      createdUser: user,
      name: dto.name,
    });

    res = await this.db.save(res);
    res.index = res.id;
    await this.db.save(res);
    return res.id;
  }

  public async findAll() {
    const res = await this.db.find({
      relations: ['parent', 'subcategories', 'assessments'],
    });
    return res;
  }

  public async findOne(id: number) {
    const res = await this.db.findOne({
      where: {
        id: id,
      },
      relations: ['subcategories', 'parent',],
    });
    return res;
  }

  update(id: number, updateAssessmentCategoryDto: UpdateAssessmentCategoryDto) {
    return `This action updates a #${id} assessmentCategory`;
  }

  remove(id: number) {
    return `This action removes a #${id} assessmentCategory`;
  }

  public async delete() {
    await this.db.createQueryBuilder().delete().execute();
  }
}
