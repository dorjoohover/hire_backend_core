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
    });
    await this.db.save(res);
    return res.id;
  };

  findByCategory = async (
    limit: number,
    shuffle: boolean,
    category: number,
    prevQuestions: number[],
  ) => {
    const res =
      prevQuestions.length > 0
        ? await this.db
            .createQueryBuilder('entity')
            .select([
              'entity.id',
              'entity.name',
              'entity.level',
              'entity.minValue',
              'entity.maxValue',
              'entity.orderNumber',
              'entity.file',
            ])
            .where(
              'entity.status = :status AND entity."categoryId" = :category AND entity."id" NOT IN (:prevQuestions)',
              {
                status: QuestionStatus.ACTIVE,
                category: category,
                prevQuestions: prevQuestions.join(','),
              },
            )
            .orderBy(shuffle ? 'RANDOM()' : 'entity.id')
            .limit(limit)
            .getMany()
        : await this.db
            .createQueryBuilder('entity')
            .select([
              'entity.id',
              'entity.name',
              'entity.level',
              'entity.minValue',
              'entity.maxValue',
              'entity.orderNumber',
              'entity.file',
            ])
            .where(
              'entity.status = :status AND entity."categoryId" = :category',
              {
                status: QuestionStatus.ACTIVE,
                category: category,
              },
            )
            .orderBy(shuffle ? 'RANDOM()' : 'entity.id')
            .limit(limit)
            .getMany();

    return res;
  };

  findAll = async () => {
    return await this.db.find({
      relations: ['answers', 'matrix'],
    });
  };

  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
      relations: ['matrix', 'answers'],
    });
  };
  clear = async () => {
    return await this.db.createQueryBuilder().delete().execute();
  };
}
