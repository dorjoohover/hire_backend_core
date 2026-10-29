import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MessageDraftEntity } from './entities/message-draft.entity';

@Injectable()
export class MessageDraftDao {
  private _db: Repository<MessageDraftEntity>;

  constructor(private dataSource: DataSource) {
    this._db = this.dataSource.getRepository(MessageDraftEntity);
  }

  findAll = () =>
    this._db.find({ order: { type: 'ASC', updatedAt: 'DESC' } });

  findOne = (id: number) => this._db.findOneBy({ id });

  /** { inviteEmail: draft, ... } — type бүрийн идэвхтэй драфт. */
  getActive = async (): Promise<Record<string, MessageDraftEntity>> =>
    Object.fromEntries(
      (await this._db.find({ where: { active: true } })).map((d) => [d.type, d]),
    );

  /** Идэвхтэй болгоход тухайн type-ийн бусдыг унтраана (нэг transaction). */
  save = (draft: Partial<MessageDraftEntity>) =>
    this.dataSource.transaction(async (m) => {
      if (draft.active)
        await m.update(
          MessageDraftEntity,
          { type: draft.type, active: true },
          { active: false },
        );
      return m.save(MessageDraftEntity, draft);
    });

  delete = (id: number) => this._db.delete(id);
}
