import { Injectable } from '@nestjs/common';
import {
  Between,
  DataSource,
  In,
  IsNull,
  Like,
  Not,
  Repository,
} from 'typeorm';
import { ExamEntity } from '../entities/exam.entity';
import { AdminExamDto, CreateExamDto } from '../dto/create-exam.dto';
import { UserEntity } from 'src/app/user/entities/user.entity';
import { UpdateDateDto } from 'src/app/user.service/dto/update-user.service.dto';
import { ResultEntity } from '../entities/result.entity';
import { ResultDetailEntity } from '../entities/result.detail.entity';
import { ResultDetailDto, ResultDto } from '../dto/result.dto';

@Injectable()
export class ResultDao {
  private db: Repository<ResultEntity>;
  private detail: Repository<ResultDetailEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(ResultEntity);
    this.detail = this.dataSource.getRepository(ResultDetailEntity);
  }

  create = async (dto: ResultDto, details: ResultDetailDto[] = []) => {
    const res = this.db.create(dto);
    await this.db.save(res);
    for (const detail of details) {
      const d = this.detail.create({ ...detail, result: { id: res.id } });
      await this.detail.save(d);
    }

    return res.id;
  };

  // update = async (code: number, dto: ResultDto, details?: ResultDetailDto[]) => {
  //   const res = await this.db.findOne({ where: { code: code } });
  //   await this.db.save({ ...res, ...dto });
  // };

  findAll = async () => {
    return await this.db.find({
      //   relations: [''],
    });
  };

  findOne = async (code: number) => {
    return await this.db.findOne({
      where: {
        code,
      },
      relations: ['details'],
    });
  };

  findQuartile = async (assessment: number) => {
    const res = await this.db.find({
      where: {
        assessment: assessment,
        point: Not(IsNull()),
      },
      select: {
        point: true,
      },
      order: {
        point: 'ASC', // Sort results in ascending order
      },
    });

    return res.map((r) => r.point);
  };
}
