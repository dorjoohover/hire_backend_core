import { ApiProperty } from '@nestjs/swagger';
import { ParentProperty } from 'src/base/base.dto';

export class CreateUserServiceDto {
  @ApiProperty()
  price: number;

  @ApiProperty()
  count: number;
  @ApiProperty()
  usedUserCount: number;

  @ApiProperty({
    type: ParentProperty,
  })
  user: {
    id: number;
  };
  @ApiProperty({
    type: ParentProperty,
  })
  assessment: {
    id: number;
  };
}
