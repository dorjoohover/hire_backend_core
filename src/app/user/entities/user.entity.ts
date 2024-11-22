import { PaymentEntity } from 'src/app/payment/entities/payment.entity';
import { UserServiceEntity } from 'src/app/user.service/entities/user.service.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column({ unique: true })
  email: string;
  @Column()
  name: string;

  @Column()
  password: string;
  @Column()
  role: number;
  @Column({ nullable: true })
  wallet?: number;
  @OneToMany(() => PaymentEntity, (payment) => payment.user, {
    nullable: true,
  })
  payments?: PaymentEntity[];
  @OneToMany(() => UserServiceEntity, (service) => service.user, {
    nullable: true,
  })
  services?: UserServiceEntity[];
}
