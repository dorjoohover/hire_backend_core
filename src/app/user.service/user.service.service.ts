import { Injectable } from '@nestjs/common';
import {
  CreateExamServiceDto,
  CreateUserServiceDto,
} from './dto/create-user.service.dto';
import { UpdateUserServiceDto } from './dto/update-user.service.dto';
import { UserServiceDao } from './user.service.dao';
import { BaseService } from 'src/base/base.service';
import { PaymentService } from '../payment/payment.service';
import { TransactionDao } from '../payment/dao/transaction.dao';
import { ExamService } from '../exam/exam.service';

@Injectable()
export class UserServiceService extends BaseService {
  constructor(
    private dao: UserServiceDao,
    private transactionDao: TransactionDao,
    private examService: ExamService,
  ) {
    super();
  }
  public async create(dto: CreateUserServiceDto, user: number) {
    return await this.dao.create({ ...dto, user: user });
  }

  public async createExam(dto: CreateExamServiceDto) {
    const service = await this.dao.findOne(dto.service);
    await this.examService.create({
      endDate: dto.endDate,
      service: dto.service,
      startDate: dto.startDate,
      assessment: service.assessment
    });
  }

  findAll() {
    return `This action returns all userService`;
  }

  findOne(id: number) {
    return `This action returns a #${id} userService`;
  }

  update(id: number, updateUserServiceDto: UpdateUserServiceDto) {
    return `This action updates a #${id} userService`;
  }

  remove(id: number) {
    return `This action removes a #${id} userService`;
  }
}
