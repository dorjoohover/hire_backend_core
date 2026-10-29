import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Хэрэглэгч рүү явах урилга / сануулгын драфт (admin → "Мэйлийн загвар").
 * type бүрт нэг идэвхтэй драфт илгээлтэд хэрэглэгдэнэ (uq_message_draft_active).
 */
@Entity('message_draft')
export class MessageDraftEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  name: string;

  /** inviteEmail | inviteSms | remindEmail | remindSms */
  @Column({ length: 16 })
  type: string;

  @Column({ length: 255, nullable: true })
  subject: string;

  /** И-мэйл: HTML, SMS: энгийн текст. */
  @Column({ type: 'text' })
  body: string;

  @Column({ default: false })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
