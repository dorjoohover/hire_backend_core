import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Хэрэглэгч рүү явах урилга / сануулгын ерөнхий драфт (admin засна). key = MessageTemplates-ийн түлхүүр. */
@Entity('message_template')
export class MessageTemplateEntity {
  @PrimaryColumn({ length: 32 })
  key: string;

  @Column({ type: 'text' })
  body: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
