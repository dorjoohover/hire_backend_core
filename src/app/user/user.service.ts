import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BaseService } from 'src/base/base.service';
import { UserDao } from './user.dao';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UserService {
  constructor(private dao: UserDao) {}
  public async addUser(dto: CreateUserDto): Promise<void> {
    const saltOrRounds = 1;
    const password = await bcrypt.hash(dto.password, saltOrRounds);
    await this.dao.add({
      ...dto,
      password: password,
    });
  }
  public async getAll() {
    return await this.dao.getAll();
  }

  findAll() {
    return `This action returns all user`;
  }

  async getUser(dto: string) {
    return await this.dao.getByEmail(dto);
  }
  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
