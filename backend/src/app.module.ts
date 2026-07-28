import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import pool from './database.provider';
import { CustomerModule } from './customers/customer.module';
import { ReturnsModule } from './returns/returns.module';
import { ShiftsModule } from './shifts/shifts.module';
import { AuditModule } from './audit/audit.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [CustomerModule, ReturnsModule, ShiftsModule, AuditModule, ReportsModule],
  controllers: [AppController],
  providers: [AppService, AuthService, AuthGuard, RolesGuard, {
    provide: 'DATABASE_POOL',
    useValue: pool,
  }],
})
export class AppModule {}
