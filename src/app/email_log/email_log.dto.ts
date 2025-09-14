import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { EmailLogStatus, EmailLogType } from 'src/base/constants';

export class EmailLogDto {
  @ApiProperty({ description: 'Хүлээн авагчийн email' })
  @IsEmail()
  toEmail: string;

  @ApiPropertyOptional({ description: 'Email subject' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ enum: EmailLogStatus, description: 'Email status' })
  @IsOptional()
  @IsEnum(EmailLogStatus)
  status?: EmailLogStatus;
  @ApiPropertyOptional({ enum: EmailLogType, description: 'Email status' })
  @IsOptional()
  @IsEnum(EmailLogType)
  type?: EmailLogType;

  @ApiPropertyOptional({ description: 'Email-д байгаа URL холбоос' })
  @IsOptional()
  @IsString()
  url?: string;
  code?: string;
  firstname?: string;
  lastname?: string;
  visible?: boolean;
  phone?: string;

  @ApiPropertyOptional({ description: 'Email зорилго/Action' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Алдаа гарсан тохиолдолд текст' })
  @IsOptional()
  @IsString()
  error?: string;
}
