import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard } from '../auth.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';

@Controller('reports')
@UseGuards(AuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles('admin', 'manager')
  getDashboard() {
    return this.reportsService.getDashboardStats();
  }

  @Get('inventory')
  @Roles('admin', 'manager')
  getInventory() {
    return this.reportsService.getInventoryValuation();
  }

  @Get('sales')
  @Roles('admin', 'manager')
  getSales(
    @Query('groupBy') groupBy: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.reportsService.getSalesReports(groupBy, startDate, endDate);
  }

  @Get('customers')
  @Roles('admin', 'manager')
  getCustomers() {
    return this.reportsService.getCustomerReports();
  }

  @Get('audit-logs')
  @Roles('admin')
  getAuditLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('module') moduleName?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.reportsService.getAuditLogs({
      userId: userId ? Number(userId) : undefined,
      action,
      module: moduleName,
      startDate,
      endDate,
    });
  }
}
