import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Db, In, Like, Raw, Repository } from 'typeorm';
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

  getAll = async (pg: PaginationDto) => {
    const { page, limit, role, email, orgName, orgRegister, firstname } = pg;
    let where: any = {};

    if (role == 35) {
      where.role = In([Role.admin, Role.tester, Role.super_admin]);
    } else if (role) {
      where.role = role;
    } else {
      where.role = Role.client;
    }

    if (email) {
      where.email = Raw((alias) => `LOWER(${alias}) LIKE LOWER(:email)`, {
        email: `%${email}%`,
      });
    }
    if (orgName) {
      where.organizationName = Raw(
        (alias) => `LOWER(${alias}) LIKE LOWER(:orgName)`,
        {
          orgName: `%${orgName}%`,
        },
      );
    }
    if (firstname) {
      where.firstname = Raw(
        (alias) => `LOWER(${alias}) LIKE LOWER(:firstname)`,
        {
          firstname: `%${firstname}%`,
        },
      );
    }

    if (orgRegister) {
      where.organizationRegisterNumber = orgRegister;
    }
    const [data, count] = await this._db.findAndCount({
      where: where,
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
    if (!isNaN(+email)) {
      where = {
        id: +email,
      };
    }
    // {
    //       organizationRegisterNumber: email,
    //     },
    const res = await this._db.findOne({
      where: [
        where,
        
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
