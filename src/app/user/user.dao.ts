import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserDao {
  private _db: Repository<UserEntity>;

  constructor(private dataSource: DataSource) {
    this._db = this.dataSource.getRepository(UserEntity);
  }

  add = async (user: UserEntity) => {
    const res = this._db.create({
      ...user,
    });
    await this._db.save(res);
    return true;
  };

  update = async (user: UpdateUserDto) => {
    const { id, ...d } = user;
    const res = await this._db.findOne({ where: { id: id } });
    const body = {
      d,
    };
    await this._db.save({
      ...res,
      ...body,
    });
    return res.id;
  };

  updateWallet = async (id: number, point: number) => {
    const user = await this._db.findOne({ where: { id: id } });
    user.wallet += point;
    const res = await this._db.save(user);
    return res;
  };

  changePassword = async (id: string, password: string, merchantId: string) => {
    // const builder = new SqlBuilder({ password }, ['password']);
    // const { cols, indexes } = builder.create();
    // const criteria = builder
    //   .condition('id', '=', id)
    //   .condition('merchantId', '=', merchantId)
    //   .criteria();
    // await this._db._update(
    //   `UPDATE "${tableName}" SET (${cols}) = ROW(${indexes}) ${criteria}`,
    //   builder.values,
    // );
  };
  getAll = async () => {
    const res = await this._db.find();
    return res;
  };
  get = async (id: any) => {
    return await this._db.findOne({
      where: [
        {
          id: id,
        },
      ],
    });
  };

  getByEmail = async (email: string) => {
    if (!email) return null;
    const res = await this._db.findOne({
      where: [
        {
          email: email,
        },
        {
          organizationRegisterNumber: email,
        },
      ],
    });
    return res;
  };

  getUserInfo = async (id: any) => {
    return this._db.findOne({
      select: ['id', 'email', 'role'],
      where: {
        id: id,
      },
    });
  };
}
