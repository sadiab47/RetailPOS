import { Body, Controller, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { OpenShiftDto, CloseShiftDto, CashMovementDto } from './dto/shifts.dto';
import { AuthGuard } from '../auth.guard';

@Controller('shifts')
@UseGuards(AuthGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('active')
  async getActive(@Req() req: any) {
    const userId = req.user?.id;
    return this.shiftsService.getActiveShift(userId);
  }

  @Get('registers')
  async getRegisters() {
    return this.shiftsService.getRegisters();
  }

  @Post('open')
  async open(@Req() req: any, @Body() dto: OpenShiftDto) {
    const userId = req.user?.id;
    return this.shiftsService.openShift(userId, dto);
  }

  @Post('close')
  async close(@Req() req: any, @Body() dto: CloseShiftDto) {
    const userId = req.user?.id;
    return this.shiftsService.closeShift(userId, dto);
  }

  @Post('movement')
  async movement(@Req() req: any, @Body() dto: CashMovementDto) {
    const userId = req.user?.id;
    return this.shiftsService.addManualMovement(userId, dto);
  }

  @Get(':id/summary')
  async getSummary(@Param('id') id: string) {
    return this.shiftsService.getShiftSummary(Number(id));
  }
}
