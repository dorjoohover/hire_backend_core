import { Injectable } from '@nestjs/common';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';
import { ExamEntity } from '../entities/exam.entity';
import { CreateExamDto } from '../dto/create-exam.dto';
import { UserEntity } from 'src/app/user/entities/user.entity';
import { UpdateDateDto } from 'src/app/user.service/dto/update-user.service.dto';

@Injectable()
export class ExamDao {
  private db: Repository<ExamEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(ExamEntity);
  }

  create = async (dto: CreateExamDto, user?: UserEntity) => {
    const res = this.db.create({
      ...dto,
      service: {
        id: dto.service,
      },
      firstname: user ? user.firstname : null,
      lastname: user ? user.lastname : null,
      email: user ? user.email : null,
      phone: user ? user.phone : null,
      assessmentName: dto.assessment.name,
      assessment: { id: dto.assessment.id },
    });
    await this.db.save(res);
    return res.id;
  };

  update = async (code: number, dto: any) => {
    const res = await this.db.findOne({ where: { code: code } });
    await this.db.save({ ...res, ...dto });
  };

  updateDate = async (id: number, dto: UpdateDateDto) => {
    await this.db.update(id, {
      startDate: dto.startDate,
      endDate: dto.endDate,
    });
  };

  updateByCode = async (
    code: number,
    dto: { email: string; lastname: string; firstname: string; phone: string },
  ) => {
    const { email, lastname, firstname, phone } = dto;
    const res = await this.db.findOne({ where: { code: code } });
    await this.db.save({ ...res, email, lastname, firstname, phone });
  };

  endExam = async (code: number) => {
    const res = await this.db.findOne({ where: { code } });
    await this.db.save({ ...res, userEndDate: new Date() });
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

  findByService = async (service: number) => {
    return await this.db.find({
      where: {
        service: {
          id: service,
        },
      },
    });
  };

  findByUser = async (id: number[], user: number) => {
    return await this.db.find({
      where: {
        service: {
          id: In(id),
          user: {
            id: user,
          },
        },
      },
      relations: ['assessment'],
    });
  };
  findByAdmin = async (assessment: number, page: number, limit: number) => {
    return await this.db.find({
      where: {
        assessment: {
          id: assessment == 0 ? Not(0) : assessment,
        },
      },
      take: limit,
      skip: (page - 1) * limit,
      relations: ['assessment'],
    });
  };
  findByCode = async (code: number) => {
    const res = await this.db.findOne({
      where: {
        code: code,
      },
      relations: ['assessment', 'service'],
    });
    return res;
  };

  findQuartile = async (assessment: number, r: number) => {
    const [res, count] = await this.db.findAndCount({
      where: {
        assessment: {
          id: assessment,
        },
        result: Not(IsNull()),
      },
      order: {
        result: 'ASC', // Sort results in ascending order
      },
    });

    if (count === 0) return { q: [], percent: null }; // Handle empty dataset

    const calculatePercentile = (percent: number) => {
      const pos = ((count + 1) * percent) / 100;
      const lowerIndex = Math.floor(pos) - 1;
      const upperIndex = Math.min(lowerIndex + 1, res.length - 1); // Prevent out-of-bounds

      if (lowerIndex < 0) return +res[0].result; // Ensure valid index

      const fraction = +(pos - Math.floor(pos)).toFixed(2);
      return (
        +res[lowerIndex].result +
        fraction * (+res[upperIndex].result - +res[lowerIndex].result)
      );
    };

    // Compute quartiles
    const q = [
      +res[0].result,
      calculatePercentile(25),
      calculatePercentile(50),
      calculatePercentile(75),
      +res[res.length - 1].result,
    ];

    // Find percentile of the given `r` value
    const index = res.findIndex((entry) => +entry.result === r);
    const percent = index !== -1 ? ((index + 1) / count) * 100 : null; // Null if `r` not found

    return { q, percent: Math.round(percent) };
  };
}
