import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { FormuleService } from './formule.service';
import { Role } from 'src/auth/guards/role/role.enum';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { FormuleDto } from './formule.dto';

@Controller('formule')
@ApiTags('Formule')
export class FormuleController {
  constructor(private readonly service: FormuleService) {}

  @Post()
  @Roles(Role.admin)
  create(@Body() dto: FormuleDto, @Request() { user }) {
    return this.service.create(dto, user['id']);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('find/:id')
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  // @Get('calculate/:id')
  // @ApiParam({ name: 'id' })
  // calc(@Param('id') id: string) {
  //   return this.service.calculate(+id);
  // }
}
