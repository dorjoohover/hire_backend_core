import { AssessmentEntity } from 'src/app/assessment/entities/assessment.entity';
import { UserEntity } from 'src/app/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('contact')
export class ContactEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt?: Date;

  @Column()
  type: number;
  @Column({ nullable: true })
  message: string;
  @Column()
  phone: string;
  @Column()
  email: string;
  @Column()
  name: string;
}
