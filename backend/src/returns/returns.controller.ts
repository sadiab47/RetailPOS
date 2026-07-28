import { Body, Controller, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/returns.dto';
import { AuthGuard } from '../auth.guard';

@Controller('returns')
@UseGuards(AuthGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  create(@Body() dto: CreateReturnDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.returnsService.createReturn(dto, userId);
  }

  @Get()
  findAll() {
    return this.returnsService.getReturns();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.returnsService.getReturnById(Number(id));
  }
}
