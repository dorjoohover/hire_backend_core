import { Injectable } from '@nestjs/common';
import { CreateEmailLogDto } from './dto/create-email_log.dto';
import { UpdateEmailLogDto } from './dto/update-email_log.dto';

@Injectable()
export class EmailLogService {
  create(createEmailLogDto: CreateEmailLogDto) {
    return 'This action adds a new emailLog';
  }

  findAll() {
    return `This action returns all emailLog`;
  }

  findOne(id: number) {
    return `This action returns a #${id} emailLog`;
  }

  update(id: number, updateEmailLogDto: UpdateEmailLogDto) {
    return `This action updates a #${id} emailLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} emailLog`;
  }
}
