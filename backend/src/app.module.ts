import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import pool from './database.provider';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, AuthService, AuthGuard, RolesGuard, {
    provide: 'DATABASE_POOL',
    useValue: pool,
  }],
})
export class AppModule {}
