import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  password?: string;

  @ApiProperty({
    default: 'test@test.com',
  })
  email: string;

  @ApiProperty({ nullable: true })
  phone?: string;
  @ApiProperty()
  organizationPhone?: string;
  @ApiProperty()
  position?: string;
  @ApiProperty()
  organizationRegisterNumber?: string;
  @ApiProperty()
  organizationName?: string;
  @ApiProperty()
  lastname?: string;
  @ApiProperty()
  firstname?: string;
  @ApiProperty()
  profile?: string;
  wallet?: number;
  emailVerified: boolean;
}

export class UserDto {
  @ApiProperty()
  @IsEmail()
  email: string;
  @ApiProperty()
  phone: string;
  @ApiProperty()
  password: string;
  @ApiProperty()
  lastname: string;
  @ApiProperty()
  firstname: string;
}

export class OrganizationDto {
  @ApiProperty()
  password: string;

  @ApiProperty({})
  @IsEmail()
  email: string;

  @ApiProperty()
  phone: string;
  @ApiProperty()
  organizationPhone: string;
  @ApiProperty()
  position: string;
  @ApiProperty()
  organizationRegisterNumber: string;
  @ApiProperty()
  organizationName: string;
  @ApiProperty()
  lastname: string;
  @ApiProperty()
  firstname: string;
}

export class PaymentUserDto {
  @ApiProperty()
  price: number;
  @ApiProperty()
  id: number;
}

export const UserExampleDto = {
  phone: '88666515',
  firstname: 'dorj',
  lastname: 'hover',
  password: 'string',
  email: 'dorjoohover@gmail.com',
};

export const OrganizationExampleDto = {
  password: 'string',
  email: 'example@hire.mn',
  phone: '88009900',
  organizationPhone: '99009900',
  position: 'string',
  organizationRegisterNumber: '0011000',
  organizationName: 'hiremn',
  lastname: 'hire',
  firstname: 'mn',
};
