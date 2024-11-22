import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  password: string;
  @ApiProperty()
  name: string;
  @ApiProperty({
    default: 'test@test.com',
  })
  email: string;
  @ApiProperty({
    default: 10,
  })
  role: number;
}
