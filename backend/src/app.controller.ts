import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { CreateProductDto } from './product.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('auth/login')
  login(@Body() loginDto: LoginDto) {
    return this.appService.login(loginDto);
  }

  @Post('auth/register')
  register(@Body() registerDto: RegisterDto) {
    return this.appService.register(registerDto);
  }

  @Get('products')
  getProducts() {
    return this.appService.getProducts();
  }

  @Post('products')
  createProduct(@Body() createProductDto: CreateProductDto) {
    return this.appService.createProduct(createProductDto);
  }
}
