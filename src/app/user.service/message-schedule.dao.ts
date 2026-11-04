import { Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { MessageScheduleEntity } from './entities/message-schedule.entity';

@Injectable()
export class MessageScheduleDao {
  private _db: Repository<MessageScheduleEntity>;

  constructor(private dataSource: DataSource) {
    this._db = this.dataSource.getRepository(MessageScheduleEntity);
  }

  add = (row: Partial<MessageScheduleEntity>) => this._db.save(this._db.create(row));

  list = (owner: number, services?: number[]) =>
    this._db.find({
      where: { owner, ...(services?.length ? { service: In(services) } : {}) },
      order: { sendAt: 'DESC' },
      take: 50,
    });

  /** Зөвхөн хүлээгдэж буйг; admin бусдынхыг ч цуцална. */
  cancel = async (id: number, owner?: number) =>
    !!(
      await this._db.update(
        { id, status: 'pending', ...(owner != null ? { owner } : {}) },
        { status: 'cancelled' },
      )
    ).affected;

  /** Хугацаа болсныг атомар "sending" болгож авна — 4 replica зэрэг ажилласан ч нэг л удаа илгээнэ. */
  claimDue = async (limit = 20): Promise<MessageScheduleEntity[]> => {
    const [rows] = await this.dataSource.query(
      `UPDATE message_schedule SET status = 'sending'
        WHERE id IN (SELECT id FROM message_schedule
                      WHERE status = 'pending' AND "sendAt" <= now()
                      ORDER BY "sendAt" LIMIT $1 FOR UPDATE SKIP LOCKED)
        RETURNING *`,
      [limit],
    );
    return rows;
  };

  finish = (id: number, status: 'done' | 'failed', result: unknown) =>
    this._db.update({ id }, { status, result: result as any });
}
