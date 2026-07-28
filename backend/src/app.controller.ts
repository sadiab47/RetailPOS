import { Body, Controller, Get, Post, Put, Delete, UseGuards, Query, Param, Req, Request } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './auth.dto';
import { CreateProductDto } from './product.dto';
import { AuthGuard } from './auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import {
  CreateCategoryDto,
  CreateSupplierDto,
  UpdateProductDto,
  AdjustStockDto,
  CreatePurchaseOrderDto
} from './inventory.dto';
import { CreateSaleDto } from './sales.dto';
import { AuditService } from './audit/audit.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  @Post('auth/login')
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const res = await this.authService.login(loginDto);
    if (res.success && res.user) {
      await this.auditService.logAction(
        res.user.id,
        'USER',
        res.user.id,
        'LOGIN',
        'AUTH',
        null,
        { email: res.user.email },
        req
      );
    }
    return res;
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Post('auth/register')
  async register(@Body() registerDto: RegisterDto, @Req() req: any) {
    const res = await this.authService.register(registerDto);
    const actorId = req.user?.id;
    if (res.success && res.user) {
      await this.auditService.logAction(
        actorId || null,
        'USER',
        res.user.id,
        'CREATE',
        'AUTH',
        null,
        { email: res.user.email, name: res.user.name, role: res.user.role },
        req
      );
    }
    return res;
  }

  @Post('auth/refresh')
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  // ==========================================
  // CATEGORIES CRUD
  // ==========================================

  @UseGuards(AuthGuard)
  @Get('categories')
  getCategories() {
    return this.appService.getCategories();
  }

  @UseGuards(AuthGuard)
  @Get('categories/:id')
  getCategoryById(@Param('id') id: string) {
    return this.appService.getCategoryById(Number(id));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.appService.createCategory(dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @Put('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: CreateCategoryDto) {
    return this.appService.updateCategory(Number(id), dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.appService.deleteCategory(Number(id));
  }

  // ==========================================
  // SUPPLIERS CRUD
  // ==========================================

  @UseGuards(AuthGuard)
  @Get('suppliers')
  getSuppliers() {
    return this.appService.getSuppliers();
  }

  @UseGuards(AuthGuard)
  @Get('suppliers/:id')
  getSupplierById(@Param('id') id: string) {
    return this.appService.getSupplierById(Number(id));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @Post('suppliers')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.appService.createSupplier(dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @Put('suppliers/:id')
  updateSupplier(@Param('id') id: string, @Body() dto: CreateSupplierDto & { isActive?: boolean }) {
    return this.appService.updateSupplier(Number(id), dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @Delete('suppliers/:id')
  deleteSupplier(@Param('id') id: string) {
    return this.appService.deleteSupplier(Number(id));
  }

  // ==========================================
  // PRODUCTS CRUD ENHANCEMENTS
  // ==========================================

  @UseGuards(AuthGuard)
  @Get('products')
  getProducts(@Query() query: any) {
    return this.appService.getProducts(query);
  }

  @UseGuards(AuthGuard)
  @Get('products/:id')
  getProductById(@Param('id') id: string) {
    return this.appService.getProductById(Number(id));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @Post('products')
  async createProduct(@Body() createProductDto: CreateProductDto, @Req() req: any) {
    const userId = req.user?.id;
    const product = await this.appService.createProduct(createProductDto, userId);
    await this.auditService.logAction(
      userId || null,
      'PRODUCT',
      product.id,
      'CREATE',
      'INVENTORY',
      null,
      product,
      req
    );
    return product;
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @Put('products/:id')
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto, @Req() req: any) {
    const userId = req.user?.id;
    const oldProduct = await this.appService.getProductById(Number(id));
    const product = await this.appService.updateProduct(Number(id), dto, userId);
    await this.auditService.logAction(
      userId || null,
      'PRODUCT',
      product.id,
      'UPDATE',
      'INVENTORY',
      oldProduct,
      product,
      req
    );
    return product;
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @Delete('products/:id')
  async deleteProduct(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    const oldProduct = await this.appService.getProductById(Number(id));
    const res = await this.appService.deleteProduct(Number(id));
    await this.auditService.logAction(
      userId || null,
      'PRODUCT',
      Number(id),
      'DELETE',
      'INVENTORY',
      oldProduct,
      null,
      req
    );
    return res;
  }

  // ==========================================
  // INVENTORY OPERATIONS
  // ==========================================

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @Post('inventory/adjust')
  adjustStock(@Body() dto: AdjustStockDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.appService.adjustStock(dto, userId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @Post('inventory/purchase')
  purchaseStock(@Body() dto: CreatePurchaseOrderDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.appService.purchaseStock(dto, userId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @Get('inventory/history')
  getInventoryHistory(@Query() query: any) {
    return this.appService.getInventoryHistory(query);
  }

  @UseGuards(AuthGuard)
  @Get('inventory/low-stock')
  getLowStock() {
    return this.appService.getLowStock();
  }

  // ==========================================
  // SALES TRANSACTIONS & BILLING (PHASE 4)
  // ==========================================

  @UseGuards(AuthGuard)
  @Post('sales')
  createSale(@Body() dto: CreateSaleDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.appService.createSale(dto, userId);
  }

  @UseGuards(AuthGuard)
  @Get('sales')
  getSales(@Query() query: any) {
    return this.appService.getSales(query);
  }

  @UseGuards(AuthGuard)
  @Get('sales/:id')
  getSaleById(@Param('id') id: string) {
    return this.appService.getSaleById(Number(id));
  }
}
