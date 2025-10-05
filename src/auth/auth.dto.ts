import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class LoginUserDto {
  @ApiProperty()
  email?: string;
  @ApiProperty()
  isOrg?: boolean;
  @ApiProperty()
  registerNumber?: string;
  @ApiProperty()
  token?: string;
  @ApiProperty({ description: 'google auth der zowhon ashiglana' })
  name?: string;
  @ApiProperty({ description: 'google auth der zowhon ashiglana' })
  profile?: string;
  @ApiProperty({ description: 'google auth der ashiglahgui' })
  password?: string;
}

export const LoginBasicDto = {
  password: 'string',
  email: 'dorjoohover@gmail.com',
};
export const LoginOrgDto = {
  password: 'string',
  registerNumber: '001100',
};
export const LoginGoogleDto = {
  name: 'dorj',
  token: 'anyToken',
  profile:
    'https://lh3.google.com/u/1/ogw/AF2bZyiHPGO9_3bE32JkoN47jLP8pxLjIwaoHhJXn5hgrGpfwQ=s32-c-mo',
  email: 'dorjoohover@gmail.com',
};
