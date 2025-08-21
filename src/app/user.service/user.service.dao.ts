import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import { UserServiceEntity } from './entities/user.service.entity';
import { CreateUserServiceDto } from './dto/create-user.service.dto';
import { AssessmentStatus, PaymentStatus } from 'src/base/constants';

@Injectable()
export class UserServiceDao {
  private db: Repository<UserServiceEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(UserServiceEntity);
  }

  create = async (dto: CreateUserServiceDto, price: number) => {
    const res = this.db.create({
      ...dto,
      price: price,
      user: { id: dto.user },
      assessment: { id: dto.assessment },
      status: price == 0 ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
    });
    await this.db.save(res);
    return res;
  };

  countByAssessment = async (id: number) => {
    const res = await this.db.count({
      where: {
        assessment: {
          id,
        },
      },
    });
    return res;
  };

  updateStatus = async (id: number, status: number) => {
    const res = await this.db.findOne({
      where: {
        id,
      },
      relations: ['assessment', 'user'],
    });
    res.status = status;
    await this.db.save(res);
    return res;
  };

  countDemand = async (limit: number) => {
    const result = await this.db
      .createQueryBuilder('item')
      .select('item.assessmentId', 'assessmentId')
      .addSelect('SUM(count)', 'sum')
      .where('item.status != :status', { status: AssessmentStatus.ARCHIVE })
      .groupBy('item.assessmentId')
      .orderBy('sum', 'DESC')
      .limit(limit)
      .getRawMany();
    return result;
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
      relations: ['assessment', 'user', 'exams'],
    });
  };

  updateCount = async (id: number, count: number, used: number) => {
    const res = await this.db.findOne({ where: { id: id } });
    res.count += count;
    res.usedUserCount += used;
    await this.db.save(res);
  };

  findByUser = async (assId: number, id: number, service: number) => {
    // const responses = await this.dao.findByUser(assId, id);
    // const res = [];
    // for (const response of responses) {
    //   const exams = response.exams;
    //   const examResults = [];
    //   for (const exam of exams) {
    //     const result = await this.result.findOne(exam.code);
    //     examResults.push({
    //       ...exam,
    //       result: result,
    //     });
    //   }
    //   res.push({ ...response, exams: examResults });
    // }
    // return res;
    return await this.db.find({
      where: {
        id: service == 0 ? Not(IsNull()) : service,
        user: {
          id: id,
        },
        assessment: {
          id: assId == 0 ? Not(assId) : assId,
        },
      },
      relations: ['assessment', 'exams', 'user'],
    });
  };
}
