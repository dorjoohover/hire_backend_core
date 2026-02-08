import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class FormuleDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  formula: string;
  @ApiProperty({ isArray: true })
  variables: number[];

  @ApiProperty({
    example: ['answerCategoryId'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  groupBy: string[];

  @ApiProperty({
    example: [{ field: 'point', operation: 'SUM' }],
    type: 'array',
    items: {
      type: 'object',
      properties: {
        field: { type: 'string' },
        operation: {
          type: 'string',
          enum: ['SUM', 'AVG', 'COUNT', 'MAX', 'MIN'],
        },
      },
    },
  })
  @IsArray()
  aggregations: {
    field: string;
    operation: string;
  }[];

  @ApiProperty({ nullable: true, required: false })
  assessment?: number;

  // @ApiProperty({
  //   description:
  //     'Optional filters for the query, with table aliases (e.g., "sales.region", "product.category")',
  //   example: {
  //     'sales.region': 'North',
  //     'product.category': 'Electronics',
  //   },
  //   required: false,
  //   type: 'object',
  // })
  @ApiProperty()
  @IsOptional()
  filters?: {
    [key: string]: any;
  };

  @ApiProperty()
  limit?: number;
  @ApiProperty()
  order?: string;
  @ApiProperty()
  sort: boolean;

  @ApiProperty({
    isArray: true,
    required: false,
    type: () => FormuleDto,
    example: [
      {
        name: 'Sub formula 1',
        formula: 'SUM(point)',
        variables: [1, 2],
        groupBy: ['answerCategoryId'],
        aggregations: [{ field: 'point', operation: 'SUM' }],
        sort: false,
        category: 1,
        is_calculated: true,
      },
    ],
  })
  @ApiProperty()
  category?: number;
  @ApiProperty()
  is_calculated?: boolean;
  @IsOptional()
  @IsArray()
  subFormulas?: FormuleDto[];
}
