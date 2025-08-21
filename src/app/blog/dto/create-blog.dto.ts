import { ApiProperty } from '@nestjs/swagger';

export class CreateBlogDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;
  @ApiProperty()
  minutes: number;
  @ApiProperty()
  category: number;
  @ApiProperty()
  image: string;
  @ApiProperty()
  video: string;
  @ApiProperty()
  pinned: boolean;
}
