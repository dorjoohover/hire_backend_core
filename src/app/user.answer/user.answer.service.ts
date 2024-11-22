import { Injectable } from '@nestjs/common';
import { CreateUserAnswerDto } from './dto/create-user.answer.dto';
import { UpdateUserAnswerDto } from './dto/update-user.answer.dto';
import { UserAnswerDao } from './user.answer.dao';

@Injectable()
export class UserAnswerService {
  constructor(private dao: UserAnswerDao) {}
  create(createUserAnswerDto: CreateUserAnswerDto) {
    return 'This action adds a new userAnswer';
  }

  findAll() {
    return `This action returns all userAnswer`;
  }

  findOne(id: number) {
    return `This action returns a #${id} userAnswer`;
  }

  update(id: number, updateUserAnswerDto: UpdateUserAnswerDto) {
    return `This action updates a #${id} userAnswer`;
  }

  remove(id: number) {
    return `This action removes a #${id} userAnswer`;
  }
}
