import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { EmailLogDao } from './email_log.dao';
import { EmailLogDto } from './email_log.dto';
import { PaginationDto } from 'src/base/decorator/pagination';
import { EmailLogStatus, EmailLogType } from 'src/base/constants';
import { UserAnswerService } from '../user.answer/user.answer.service';
import { UserServiceService } from '../user.service/user.service.service';

@Injectable()
export class EmailLogService {
  constructor(
    private dao: EmailLogDao,
    @Inject(forwardRef(() => UserAnswerService))
    private userAnswerService: UserAnswerService,
    @Inject(forwardRef(() => UserServiceService))
    private userServiceService: UserServiceService,
  ) {}
  public async create(dto: EmailLogDto) {
    return await this.dao.create({ ...dto, status: EmailLogStatus.PENDING });
  }

  public async findAll(pg: PaginationDto) {
    return await this.dao.findAll(pg);
  }

  public async updateStatus(
    id: number,
    status: EmailLogStatus,
    error?: string,
  ) {
    await this.dao.updateStatus(id, status, error);
  }

  public async deleteOne(id: number) {
    await this.dao.delete(id);
  }
  public async send(id: number, type: EmailLogType) {
    const log = await this.dao.findOne(id);
    if (type == EmailLogType.REPORT) {
      await this.userAnswerService.createReport(+log.code);
    }
    if (type == EmailLogType.INVITATION) {
      await this.userServiceService.sendLinkToMail({
        links: [
          {
            code: +log.code,
            email: log.toEmail,
            firstname: log.firstname,
            lastname: log.lastname,
            phone: log.phone,
            visible: log.visible,
          },
        ],
      });
    }
  }
}
