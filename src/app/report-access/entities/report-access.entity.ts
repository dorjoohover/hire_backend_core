import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Тайлан нээх эрхийн бүртгэл (monetization).
 *
 * Нэг exam `code` дээр `status = SUCCESS` мөр байвал тухайн тайланг
 * ХЯЗГААРГҮЙ харах, мөн PDF татах эрхтэй болно. Өөрөөр хэлбэл
 * "1 удаа үнэгүй харах" ба "PDF татахад төлбөртэй" гэсэн хоёр дүрэм
 * нэг л худалдан авалтаар нээгддэг.
 */
@Entity('report_access')
export class ReportAccessEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  /** exam.code */
  @Index()
  @Column()
  code: string;

  /** Хэн төлсөн (нэвтрээгүй бол null). */
  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  assessmentId: number;

  /** PaymentStatus: 10 = PENDING, 20 = SUCCESS, 30 = FAILED */
  @Column({ default: 10 })
  status: number;

  @Column({ default: 0 })
  price: number;

  /** QPay invoice_id */
  @Column({ nullable: true })
  invoiceId: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  paidAt: Date;
}
