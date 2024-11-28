import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class LoginUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;
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
export const LoginGoogleDto = {
  name: 'dorj',
  profile:
    'https://lh3.google.com/u/1/ogw/AF2bZyiHPGO9_3bE32JkoN47jLP8pxLjIwaoHhJXn5hgrGpfwQ=s32-c-mo',
  email: 'dorjoohover@gmail.com',
};
