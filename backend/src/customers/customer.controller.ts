import { Body, Controller, Get, Post, Put, Delete, UseGuards, Query, Param, Req } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AuthGuard } from '../auth.guard';

@Controller('customers')
@UseGuards(AuthGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  create(@Body() dto: CreateCustomerDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.customerService.createCustomer(dto, userId);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('phone') phone?: string,
    @Query('code') code?: string
  ) {
    return this.customerService.getCustomers({ search, phone, code });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customerService.getCustomerById(Number(id));
  }

  @Get(':id/analytics')
  getAnalytics(@Param('id') id: string) {
    return this.customerService.getCustomerAnalytics(Number(id));
  }

  @Post(':id/pay-balance')
  payBalance(
    @Param('id') id: string,
    @Body() body: { amount: number; remarks?: string },
    @Req() req: any
  ) {
    const userId = req.user?.id;
    return this.customerService.payOutstandingBalance(Number(id), body.amount, body.remarks || '', userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customerService.updateCustomer(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customerService.deleteCustomer(Number(id));
  }
}
