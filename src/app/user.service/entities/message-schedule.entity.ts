import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Товлосон урилга / сануулга. Минут тутам `sendAt` болсон мөрийг илгээнэ (message-schedule.processor).
 * pending → sending → done | failed; хэрэглэгч pending-ийг cancelled болгоно.
 */
@Entity('message_schedule')
export class MessageScheduleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** Товлосон хэрэглэгч. Илгээхдээ admin биш бол зөвхөн өөрийн кодыг (ownedExam). */
  @Column({ type: 'int' })
  owner: number;

  @Column({ type: 'int' })
  role: number;

  /** Жагсаалтыг тестээр шүүхэд (урилгад эхний service, сануулгад эхний кодын service). */
  @Column({ type: 'int', nullable: true })
  service: number;

  /** invite | remind */
  @Column({ length: 10 })
  kind: string;

  /** invite: { services, startDate, endDate, links, noEmail, sms, emailDraft, smsDraft, remind? }
   *  remind: { codes, email, sms, emailDraft, smsDraft, condition } */
  @Column({ type: 'jsonb' })
  payload: any;

  @Column({ type: 'timestamptz' })
  sendAt: Date;

  /** pending | sending | done | failed | cancelled */
  @Column({ length: 10, default: 'pending' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  result: any;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
