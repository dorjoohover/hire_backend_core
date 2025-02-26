import { ApiProperty } from '@nestjs/swagger';

export class ResultDto {
  @ApiProperty()
  code: number;
  @ApiProperty()
  assessmentName: string;
  @ApiProperty()
  lastname: string;
  @ApiProperty()
  firstname: string;
  @ApiProperty()
  total?: number;
  @ApiProperty()
  type: number;
  @ApiProperty()
  assessment: number;
  // possible duration
  @ApiProperty()
  limit: number;
  //during duration
  @ApiProperty()
  duration: number;
  @ApiProperty()
  point?: number;
  // in disc (d || c || di)
  @ApiProperty()
  result?: string;
  // in disc (undershift | overshift)
  @ApiProperty()
  value?: string;
}

export class ResultDetailDto {
  // @ApiProperty()
  // result: number;
  //   in disc (Хувиа хичээгч, шулуухан)
  @ApiProperty()
  value?: string;
  // like key => in disc intensity(27.5)
  @ApiProperty()
  cause?: string;
  //   in disc d, c , i, s
  @ApiProperty()
  category?: string;
}
