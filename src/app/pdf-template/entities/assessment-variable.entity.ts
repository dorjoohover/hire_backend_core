import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Studio-ийн "Хэрэглэгчийн variable" — тухайн assessment-д зориулж
// хэрэглэгч ӨӨРӨӨ нэрлэсэн key->утга map (жиш нь "characterDescription":
// {d: "урт текст", i: "урт текст", ...}) үүсгэж, дараа нь тайланд token
// болгон ашиглах боломжтой болгоно. Нэг assessment дээр ОЛОН variable
// (өөр өөр "key" нэртэй) байж болно — UNIQUE(assessmentId, key).
// Ашиглах token: {{custom.<key>}} — hire_report/dynamic-template.renderer.ts
// render үед exam.assessment.id-аар бүх variable-ыг татаж, тухайн exam-ийн
// result.result (жиш нь "d") утгаар entries дотроос тохирох мөрийг олж
// автоматаар орлуулна (DISC.characterDescription-тэй яг адил зарчим).
@Entity('assessment_variable')
@Index(['assessmentId', 'key'], { unique: true })
export class AssessmentVariableEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column()
  assessmentId: number;

  // Жиш нь "characterDescription" — token дотор "custom." угтвартай орно.
  @Column({ length: 100 })
  key: string;

  // Studio UI-д харуулах нэр (жиш нь "Хэв шинжийн дэлгэрэнгүй тайлбар").
  @Column({ length: 255, nullable: true })
  label?: string;

  // key->text map, жиш: {"d": "...", "i": "...", "s": "...", "c": "..."}
  @Column({ type: 'jsonb', nullable: true })
  entries?: Record<string, string>;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt?: Date;
}
