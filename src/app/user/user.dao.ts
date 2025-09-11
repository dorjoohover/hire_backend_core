import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Db, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from 'src/auth/guards/role/role.enum';
import { PaginationDto } from 'src/base/decorator/pagination';

@Injectable()
export class UserDao {
  private _db: Repository<UserEntity>;

  constructor(private dataSource: DataSource) {
    this._db = this.dataSource.getRepository(UserEntity);
  }
  verify = async (data: string, isEmail: boolean, email: string) => {
    const body = !isEmail
      ? {
          phoneVerified: true,
        }
      : {
          emailVerified: true,
        };
    const b = !isEmail ? { phone: data, email: email } : { email: email };
    const res = await this._db.findOne({ where: b });
    if (!res)
      throw new HttpException(
        'Бүртгэлгүй хэрэглэгч байна.',
        HttpStatus.UNAUTHORIZED,
      );
    if (!res.emailVerified) await this._db.save({ ...res, ...body });
  };
  add = async (user: UserEntity) => {
    const res = this._db.create({
      ...user,
    });
    await this._db.save(res);
    return res;
  };
  public countUsers = async () => {
    const users = await this._db.count({
      where: {
        role: Role.client,
      },
    });
    const orgs = await this._db.count({
      where: {
        role: Role.organization,
      },
    });
    return {
      users,
      orgs,
    };
  };
  updateByEmail = async (dto: {
    email: string;
    password?: string;
    code?: string;
  }) => {
    const res = await this._db.findOne({ where: { email: dto.email } });
    if (dto.password) await this._db.save({ ...res, password: dto.password });
    if (dto.code) await this._db.save({ ...res, forget: dto.code });
  };

  update = async (user: UpdateUserDto) => {
    const { id, ...d } = user;
    const res = await this._db.findOne({ where: { id: id } });
    const body = {
      ...d,
    };
    await this._db.save({
      ...res,
      ...body,
    });
    return res.id;
  };

  delete = async (id: number) => {
    const res = await this._db.delete(id);
    return res;
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
  getAll = async (pg: PaginationDto) => {
    const { page, limit, role } = pg;
    const [data, count] = await this._db.findAndCount({
      where: {
        role: role ?? Role.client,
      },
      take: limit,
      skip: (page - 1) * limit,
    });
    const total = await this._db.count({
      where: {
        role: role ?? Role.client,
      },
    });
    return { data, count, total };
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
    let where;
    where = {
      email: email,
    };
    if (!isNaN(parseInt(email))) {
      where = {
        id: +email,
      };
    }
    const res = await this._db.findOne({
      where: [
        where,
        {
          organizationRegisterNumber: email,
        },
      ],
    });
    return res;
  };

  findByEmail = async (email: string): Promise<UserEntity | null> => {
    if (!email) return null;

    const res = await this._db.findOne({
      where: {
        email: email,
      },
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
