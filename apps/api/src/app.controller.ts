import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CheckoutDto } from './checkout.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('products')
  getProducts() {
    return this.appService.getProducts();
  }

  @Post('checkout')
  checkout(@Body() checkoutDto: CheckoutDto) {
    return this.appService.checkout(checkoutDto);
  }
}
