import { ApiProperty } from '@nestjs/swagger';

export class CreateBlogDto {
  @ApiProperty()
  title: string;
  @ApiProperty()
  image: string;
  @ApiProperty()
  content: string;
  @ApiProperty()
  minutes: number;
  @ApiProperty()
  category: number;
  @ApiProperty()
  pinned: boolean;
}
