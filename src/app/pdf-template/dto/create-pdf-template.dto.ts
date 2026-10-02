import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePdfTemplateDto {
  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  key?: string;

  @ApiPropertyOptional()
  assessmentId?: number;

  @ApiPropertyOptional()
  assessmentTypeCode?: string;

  @ApiPropertyOptional()
  context?: string;

  @ApiPropertyOptional({ type: [String] })
  content?: string[];

  @ApiPropertyOptional()
  internalView?: boolean;

  @ApiPropertyOptional()
  fontFamily?: string;

  @ApiPropertyOptional()
  fontSize?: number;

  @ApiPropertyOptional()
  color?: string;

  @ApiPropertyOptional()
  logoPosition?: string;

  @ApiProperty()
  pages: any[];

  @ApiPropertyOptional()
  aiConfig?: Record<string, any>;

  @ApiPropertyOptional()
  demoMode?: boolean;

  @ApiPropertyOptional()
  demoData?: Record<string, any>;

  @ApiPropertyOptional()
  aiJsonData?: Record<string, any>;

  @ApiPropertyOptional()
  isActive?: boolean;
}
