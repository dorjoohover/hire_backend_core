import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MessageTemplateEntity } from './entities/message-template.entity';
import { MessageTemplates, TEMPLATE_KEYS } from './message-template';

@Injectable()
export class MessageTemplateDao {
  private _db: Repository<MessageTemplateEntity>;

  constructor(private dataSource: DataSource) {
    this._db = this.dataSource.getRepository(MessageTemplateEntity);
  }

  getAll = async (): Promise<MessageTemplates> =>
    Object.fromEntries((await this._db.find()).map((r) => [r.key, r.body]));

  /** Хоосон түлхүүрийн мөрийг устгана → DEFAULT_TEMPLATES руу буцна. */
  saveAll = async (templates: MessageTemplates) => {
    for (const key of TEMPLATE_KEYS) {
      if (templates[key]) await this._db.save({ key, body: templates[key] });
      else await this._db.delete({ key });
    }
  };
}
