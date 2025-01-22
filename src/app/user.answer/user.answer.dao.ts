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
  query = async (q: string) => {
    return await this.db.query(q);
  };
  create = async (dto: CreateUserAnswerDto) => {
    try {
      const res = this.db.create({
        ...dto,
        exam: { id: +dto.exam },

        answer: dto.answer ? { id: +dto.answer } : null,
        matrix: dto.matrix ? { id: +dto.matrix } : null,
        question: { id: +dto.question },
        answerCategory: dto.answerCategory ? { id: +dto.answerCategory } : null,
        questionCategory: { id: +dto.questionCategory },
      });
      console.log(res);
      await this.db.save(res);
      return res.id;
    } catch (error) {
      console.log('err', error);
      return undefined;
    }
  };

  findAll = async () => {
    return await this.db.find({});
  };

  findByCode = async (code: number) => {
    return await this.db
      .createQueryBuilder('entity')
      .select('entity.question', 'question')
      .addSelect('COUNT(entity.id)', 'count') // Example: Count entries for each question
      .leftJoinAndSelect('entity.answer', 'answer')
      .leftJoinAndSelect('entity.matrix', 'matrix')
      .where('entity.code = :code', { code })
      .groupBy('entity.question')
      .getRawMany();
  };

  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
    });
  };

  findByExam = async (exam: number) => {
    return await this.db.find({
      where: {
        exam: {
          id: exam,
        },
      },
    });
  };

  updateOne = async (id: number, dto: CreateUserAnswerDto) => {
    let res = await this.findOne(id);

    res = await this.db.save({
      id: res.id,
      answer: { id: dto.answer },
      matrix: { id: dto.matrix },
      flag: dto.flag,
      device: dto.device,
      ip: dto.ip,
      point: dto.point,
    });
    return res.id;
  };

  // dynamic = async () => {
  //   await this.db.createQueryBuilder('', {

  //   }).addGroupBy()
  // }

  deleteOne = async (id: number) => {
    return await this.db
      .createQueryBuilder()
      .where({
        id: id,
      })
      .delete()
      .execute();
  };
}
