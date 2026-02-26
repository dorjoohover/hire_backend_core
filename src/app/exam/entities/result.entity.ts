import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ResultDetailEntity } from './result.detail.entity';

@Entity('result')
export class ResultEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;
  @ManyToOne(() => ResultEntity, (result) => result.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  parent?: ResultEntity;

  // 🔹 Children
  @OneToMany(() => ResultEntity, (result) => result.parent)
  children?: ResultEntity[];
  @Column({ nullable: true })
  code: string;

  @Column()
  assessmentName: string;

  @Column()
  lastname: string;

  @Column()
  firstname: string;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
  @OneToMany(() => ResultDetailEntity, (userAns) => userAns.result, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  details: ResultDetailEntity[];

  @Column({ nullable: true })
  total: number;
  @Column()
  type: number;
  @Column()
  assessment: number;
  // possible duration
  @Column()
  limit: number;
  //during duration
  @Column()
  duration: number;
  @Column({ nullable: true })
  question_category: number;
  @Column({ nullable: true, type: 'numeric' })
  point: number;
  // in disc (d || c || di)

  @Column({ nullable: true })
  result: string;
  @Column({ nullable: true })
  segment: string;
  // in disc (undershift | overshift)
  @Column({ nullable: true })
  value: string;
}
