import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserServiceEntity } from './entities/user.service.entity';
import { CreateUserServiceDto } from './dto/create-user.service.dto';

@Injectable()
export class UserServiceDao {
  private db: Repository<UserServiceEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(UserServiceEntity);
  }

  create = async (dto: CreateUserServiceDto) => {
    const res = this.db.create(dto);
    await this.db.save(res);
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
      //   relations: ['level'],
    });
  };
}
