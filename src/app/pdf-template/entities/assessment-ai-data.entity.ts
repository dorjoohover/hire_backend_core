import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// AI Data tab-ийн "JSON өгөгдөл" — pdf_template мөр бүрт биш, ТУХАЙН
// assessment-д НЭГ удаа хадгалагдана (олон template нэг assessment дээр
// байж болох тул template бүрт давхардуулахгүйн тулд тусдаа хүснэгт).
// core/src/app/pdf-template/pdf-template.controller.ts-ийн
// GET/PUT ai-data/:assessmentId endpoint-ээр CRUD хийгдэнэ.
@Entity('assessment_ai_data')
export class AssessmentAiDataEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column({ unique: true })
  assessmentId: number;

  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt?: Date;
}
