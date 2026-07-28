import { Body, Controller, Get, Post, Put, Delete, UseGuards, Query, Param, Req } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AuthGuard } from '../auth.guard';
import { AuditService } from '../audit/audit.service';

@Controller('customers')
@UseGuards(AuthGuard)
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly auditService: AuditService
  ) {}

  @Post()
  async create(@Body() dto: CreateCustomerDto, @Req() req: any) {
    const userId = req.user?.id;
    const customer = await this.customerService.createCustomer(dto, userId);
    await this.auditService.logAction(
      userId || null,
      'CUSTOMER',
      customer.id,
      'CREATE',
      'CUSTOMER',
      null,
      customer,
      req
    );
    return customer;
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
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @Req() req: any) {
    const userId = req.user?.id;
    const oldCustomer = await this.customerService.getCustomerById(Number(id));
    const customer = await this.customerService.updateCustomer(Number(id), dto);
    await this.auditService.logAction(
      userId || null,
      'CUSTOMER',
      customer.id,
      'UPDATE',
      'CUSTOMER',
      oldCustomer,
      customer,
      req
    );
    return customer;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    const oldCustomer = await this.customerService.getCustomerById(Number(id));
    const res = await this.customerService.deleteCustomer(Number(id));
    await this.auditService.logAction(
      userId || null,
      'CUSTOMER',
      Number(id),
      'DELETE',
      'CUSTOMER',
      oldCustomer,
      null,
      req
    );
    return res;
  }
}
