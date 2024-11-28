import { Injectable } from '@nestjs/common';
import { DataSource, DBRef, Repository } from 'typeorm';
import { QuestionEntity } from '../entities/question.entity';
import { CreateQuestionDto } from '../dto/create-question.dto';
import { QuestionStatus } from 'src/base/constants';

@Injectable()
export class QuestionDao {
  private db: Repository<QuestionEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(QuestionEntity);
  }

  create = async (dto: CreateQuestionDto) => {
    const res = this.db.create({
      ...dto,
      category: {
        id: dto.category,
      },
      type: {
        id: dto.type,
      },
    });
    await this.db.save(res);
    return res.id;
  };

  findByCategory = async (
    limit: number,
    shuffle: boolean,
    category: number,
  ) => {
    return await this.db
      .createQueryBuilder('entity')
      .where('entity.status = :status and entity."categoryId = :category', {
        status: QuestionStatus.ACTIVE,
        category: category,
      })
      .leftJoinAndSelect('entity.answers', 'answers')
      .leftJoinAndSelect('answers.matrix', 'matrix')
      .orderBy(shuffle ? 'RANDOM()' : 'entity.id')
      .limit(limit)
      .getMany();
  };

  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
    });
  };
  clear = async () => {
    return await this.db.createQueryBuilder().delete().execute();
  };
}
