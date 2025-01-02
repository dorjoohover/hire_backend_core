import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class FormulaEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  formula: string;

  @Column('simple-array', { nullable: true })
  variables: number[]; // Variables like ['a', 'b', 'c']

  @Column('simple-array', { nullable: true })
  groupBy: string[];

  @Column({ nullable: true })
  limit: number;
  @Column({ default: true })
  sort: boolean;

  @Column({ nullable: true })
  order: string;

  @Column('json', { nullable: true })
  aggregations: {
    field: string;
    operation: string;
    // operation: 'SUM' | 'AVG' | 'COUNT' | 'MAX' | 'MIN';
  }[];

  @Column('json', { nullable: true })
  filters?: {
    [key: string]: any;
  };
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updateAt: Date;
  @Column({ nullable: true })
  createdUser: number;
  @Column({ nullable: true })
  updatedUser: number;
}
