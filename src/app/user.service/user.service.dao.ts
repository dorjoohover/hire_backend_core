import { Injectable } from '@nestjs/common';
import { DataSource, Not, Repository } from 'typeorm';
import { UserServiceEntity } from './entities/user.service.entity';
import { CreateUserServiceDto } from './dto/create-user.service.dto';
import { PaymentStatus } from 'src/base/constants';

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

  updateStatus = async (id: number, status: number) => {
    const res = await this.db.findOne({
      where: {
        id,
      },
    });
    res.status = status;
    await this.db.save(res);
    return res
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
      relations: ['assessment'],
    });
  };

  updateCount = async (id: number, count: number, used: number) => {
    const res = await this.db.findOne({ where: { id: id } });
    res.count += count;
    res.usedUserCount += used;
    await this.db.save(res);
  };

  findByUser = async (assId: number, id: number) => {
    return await this.db.find({
      where: {
        user: {
          id: id,
        },
        assessment: {
          id: assId == 0 ? Not(assId) : assId,
        },
      },
      relations: ['assessment', 'exams'],
    });
  };
}
