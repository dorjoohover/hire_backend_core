import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserAnswerEntity } from './entities/user.answer.entity';
import { CreateUserAnswerDto } from './dto/create-user.answer.dto';

@Injectable()
export class UserAnswerDao {
  private db: Repository<UserAnswerEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(UserAnswerEntity);
  }

  create = async (dto: CreateUserAnswerDto) => {
    const res = this.db.create({
      ...dto,
      exam: { id: dto.exam },
      answer: { id: dto.answer },
      matrix: { id: dto.matrix },
      question: { id: dto.question },
    });
    await this.db.save(res);
  };

  findAll = async () => {
    return await this.db.find({});
  };

  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
    });
  };

  // dynamic = async () => {
  //   await this.db.createQueryBuilder('', {

  //   }).addGroupBy()
  // }
}
