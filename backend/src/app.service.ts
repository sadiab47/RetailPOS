import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { CreateProductDto } from './product.dto';
import {
  CreateCategoryDto,
  CreateSupplierDto,
  UpdateProductDto,
  AdjustStockDto,
  CreatePurchaseOrderDto
} from './inventory.dto';
import { CreateSaleDto } from './sales.dto';
@Injectable()
export class AppService {
  constructor(@Inject('DATABASE_POOL') private readonly db: Pool) {}

  getHello(): string {
    return 'RetailPOS backend is running';
  }

  // ==========================================
  // CATEGORIES CRUD
  // ==========================================

  async getCategories() {
    const [rows] = await this.db.query<RowDataPacket[]>('SELECT id, name, description, created_at, updated_at FROM categories');
    return rows;
  }

  async getCategoryById(id: number) {
    const [rows] = await this.db.query<RowDataPacket[]>('SELECT id, name, description, created_at, updated_at FROM categories WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) throw new NotFoundException('Category not found');
    return rows[0];
  }

  async createCategory(dto: CreateCategoryDto) {
    const [result] = await this.db.query<ResultSetHeader>(
      'INSERT INTO categories (name, description, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
      [dto.name, dto.description || null]
    );
    return { id: result.insertId, ...dto };
  }

  async updateCategory(id: number, dto: CreateCategoryDto) {
    await this.getCategoryById(id);
    await this.db.query<ResultSetHeader>(
      'UPDATE categories SET name = ?, description = ?, updated_at = NOW() WHERE id = ?',
      [dto.name, dto.description || null, id]
    );
    return { id, ...dto };
  }

  async deleteCategory(id: number) {
    await this.getCategoryById(id);
    await this.db.query<ResultSetHeader>('DELETE FROM categories WHERE id = ?', [id]);
    return { success: true };
  }

  // ==========================================
  // SUPPLIERS CRUD
  // ==========================================

  async getSuppliers() {
    const [rows] = await this.db.query<RowDataPacket[]>('SELECT id, company_name, contact_person, phone, email, address, is_active, created_at, updated_at FROM suppliers');
    return rows.map(r => ({ ...r, is_active: !!r.is_active }));
  }

  async getSupplierById(id: number) {
    const [rows] = await this.db.query<RowDataPacket[]>('SELECT id, company_name, contact_person, phone, email, address, is_active, created_at, updated_at FROM suppliers WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) throw new NotFoundException('Supplier not found');
    return { ...rows[0], is_active: !!rows[0].is_active };
  }

  async createSupplier(dto: CreateSupplierDto) {
    const [result] = await this.db.query<ResultSetHeader>(
      'INSERT INTO suppliers (company_name, contact_person, phone, email, address, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, TRUE, NOW(), NOW())',
      [dto.companyName, dto.contactPerson || null, dto.phone || null, dto.email || null, dto.address || null]
    );
    return { id: result.insertId, ...dto, isActive: true };
  }

  async updateSupplier(id: number, dto: CreateSupplierDto & { isActive?: boolean }) {
    await this.getSupplierById(id);
    await this.db.query<ResultSetHeader>(
      'UPDATE suppliers SET company_name = ?, contact_person = ?, phone = ?, email = ?, address = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
      [dto.companyName, dto.contactPerson || null, dto.phone || null, dto.email || null, dto.address || null, dto.isActive !== false, id]
    );
    return { id, ...dto };
  }

  async deleteSupplier(id: number) {
    await this.getSupplierById(id);
    await this.db.query<ResultSetHeader>('DELETE FROM suppliers WHERE id = ?', [id]);
    return { success: true };
  }

  // ==========================================
  // PRODUCTS CRUD ENHANCEMENTS
  // ==========================================

  async getProducts(query: {
    search?: string;
    categoryId?: string;
    supplierId?: string;
    barcode?: string;
    page?: string;
    limit?: string;
  }) {
    let sql = `
      SELECT p.id, p.barcode, p.name, p.category_id, c.name as category_name, 
             p.supplier_id, s.company_name as supplier_name, 
             p.cost_price, p.selling_price, p.stock, p.low_stock_threshold, p.sku, p.is_active
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (query.search) {
      sql += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode = ?)';
      params.push(`%${query.search}%`, `%${query.search}%`, query.search);
    }
    if (query.categoryId) {
      sql += ' AND p.category_id = ?';
      params.push(Number(query.categoryId));
    }
    if (query.supplierId) {
      sql += ' AND p.supplier_id = ?';
      params.push(Number(query.supplierId));
    }
    if (query.barcode) {
      sql += ' AND p.barcode = ?';
      params.push(query.barcode);
    }

    // Pagination
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 50)));
    const offset = (page - 1) * limit;

    sql += ' ORDER BY p.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await this.db.query<RowDataPacket[]>(sql, params);

    return rows.map((row) => ({
      id: row.id,
      barcode: row.barcode,
      name: row.name,
      categoryId: row.category_id,
      category: row.category_name,
      supplierId: row.supplier_id,
      supplier: row.supplier_name,
      costPrice: Number(row.cost_price),
      sellingPrice: Number(row.selling_price),
      stock: row.stock,
      lowStockThreshold: row.low_stock_threshold,
      sku: row.sku,
      isActive: !!row.is_active,
    }));
  }

  async getProductById(id: number) {
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT p.id, p.barcode, p.name, p.category_id, c.name as category_name, 
              p.supplier_id, s.company_name as supplier_name, 
              p.cost_price, p.selling_price, p.stock, p.low_stock_threshold, p.sku, p.is_active
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) throw new NotFoundException('Product not found');
    const row = rows[0];
    return {
      id: row.id,
      barcode: row.barcode,
      name: row.name,
      categoryId: row.category_id,
      category: row.category_name,
      supplierId: row.supplier_id,
      supplier: row.supplier_name,
      costPrice: Number(row.cost_price),
      sellingPrice: Number(row.selling_price),
      stock: row.stock,
      lowStockThreshold: row.low_stock_threshold,
      sku: row.sku,
      isActive: !!row.is_active,
    };
  }

  async createProduct(product: CreateProductDto, userId?: number) {
    const connection = await this.db.getConnection();
    await connection.beginTransaction();

    try {
      const sku = product.sku || `SKU-${Date.now()}`;
      const lowStock = product.lowStockThreshold ?? 10;
      const initialStock = product.stock ?? 0;

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO products (barcode, name, category_id, supplier_id, cost_price, selling_price, stock, low_stock_threshold, sku, is_active, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          product.barcode,
          product.name,
          product.categoryId || null,
          product.supplierId || null,
          product.costPrice,
          product.sellingPrice,
          initialStock,
          lowStock,
          sku,
          product.isActive !== false
        ]
      );

      const productId = result.insertId;

      // Every stock change must generate exactly one inventory transaction
      if (initialStock > 0) {
        await connection.query(
          `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, quantity_before, quantity_after, remarks, created_by, created_at)
           VALUES (?, 'INITIAL_STOCK', ?, 0, ?, 'Initial inventory setup', ?, NOW())`,
          [productId, initialStock, initialStock, userId || null]
        );
      }

      await connection.commit();

      return this.getProductById(productId);
    } catch (error: any) {
      await connection.rollback();
      throw new BadRequestException(error.message || 'Failed to create product');
    } finally {
      connection.release();
    }
  }

  async updateProduct(id: number, dto: UpdateProductDto, userId?: number) {
    const original = await this.getProductById(id);
    const connection = await this.db.getConnection();
    await connection.beginTransaction();

    try {
      const barcode = dto.barcode ?? original.barcode;
      const name = dto.name ?? original.name;
      const categoryId = dto.categoryId !== undefined ? dto.categoryId : original.categoryId;
      const supplierId = dto.supplierId !== undefined ? dto.supplierId : original.supplierId;
      const costPrice = dto.costPrice ?? original.costPrice;
      const sellingPrice = dto.sellingPrice ?? original.sellingPrice;
      const lowStock = dto.lowStockThreshold ?? original.lowStockThreshold;
      const sku = dto.sku ?? original.sku;
      const isActive = dto.isActive !== undefined ? dto.isActive : original.isActive;
      const stock = dto.stock ?? original.stock;

      await connection.query(
        `UPDATE products SET barcode = ?, name = ?, category_id = ?, supplier_id = ?, cost_price = ?, 
                            selling_price = ?, stock = ?, low_stock_threshold = ?, sku = ?, is_active = ?, updated_at = NOW()
         WHERE id = ?`,
        [barcode, name, categoryId, supplierId, costPrice, sellingPrice, stock, lowStock, sku, isActive, id]
      );

      // If stock was directly updated in this endpoint (manual overriding), log a transaction
      const stockDiff = stock - original.stock;
      if (stockDiff !== 0) {
        await connection.query(
          `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, quantity_before, quantity_after, remarks, created_by, created_at)
           VALUES (?, 'ADJUSTMENT', ?, ?, ?, 'Manual override via product edit', ?, NOW())`,
          [id, stockDiff, original.stock, stock, userId || null]
        );
      }

      await connection.commit();
      return this.getProductById(id);
    } catch (error: any) {
      await connection.rollback();
      throw new BadRequestException(error.message || 'Failed to update product');
    } finally {
      connection.release();
    }
  }

  async deleteProduct(id: number) {
    await this.getProductById(id);
    await this.db.query('DELETE FROM products WHERE id = ?', [id]);
    return { success: true };
  }

  // ==========================================
  // INVENTORY OPERATIONS & AUDITING
  // ==========================================

  async adjustStock(dto: AdjustStockDto, userId?: number) {
    const connection = await this.db.getConnection();
    await connection.beginTransaction();

    try {
      const [products] = await connection.query<RowDataPacket[]>('SELECT stock FROM products WHERE id = ? FOR UPDATE', [dto.productId]);
      if (!products.length) {
        throw new NotFoundException('Product not found');
      }

      const quantityBefore = products[0].stock;
      const quantityAfter = quantityBefore + dto.quantityChange;

      if (quantityAfter < 0) {
        throw new BadRequestException('Stock cannot fall below zero');
      }

      // Update stock
      await connection.query('UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?', [quantityAfter, dto.productId]);

      // Create ledger transaction
      await connection.query(
        `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, quantity_before, quantity_after, remarks, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [dto.productId, dto.transactionType, dto.quantityChange, quantityBefore, quantityAfter, dto.remarks || null, userId || null]
      );

      await connection.commit();
      return { productId: dto.productId, quantityBefore, quantityAfter, quantityChange: dto.quantityChange };
    } catch (error: any) {
      await connection.rollback();
      throw new BadRequestException(error.message || 'Stock adjustment failed');
    } finally {
      connection.release();
    }
  }

  async purchaseStock(dto: CreatePurchaseOrderDto, userId?: number) {
    const connection = await this.db.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Create Purchase Order
      const [orderResult] = await connection.query<ResultSetHeader>(
        `INSERT INTO purchase_orders (supplier_id, order_date, status, total_amount, created_by)
         VALUES (?, NOW(), 'RECEIVED', 0.00, ?)`,
        [dto.supplierId, userId || null]
      );
      const purchaseOrderId = orderResult.insertId;
      let totalAmount = 0;

      // 2. Add items, update product stock, and log transactions
      for (const item of dto.items) {
        const itemTotal = Number(item.quantity) * Number(item.unitCost);
        totalAmount += itemTotal;

        // Insert purchase item
        await connection.query(
          `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_cost)
           VALUES (?, ?, ?, ?)`,
          [purchaseOrderId, item.productId, item.quantity, item.unitCost]
        );

        // Fetch current stock
        const [products] = await connection.query<RowDataPacket[]>('SELECT stock FROM products WHERE id = ? FOR UPDATE', [item.productId]);
        if (!products.length) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        const quantityBefore = products[0].stock;
        const quantityAfter = quantityBefore + item.quantity;

        // Update product stock and cost price
        await connection.query(
          'UPDATE products SET stock = ?, cost_price = ?, updated_at = NOW() WHERE id = ?',
          [quantityAfter, item.unitCost, item.productId]
        );

        // Log transaction ledger entry
        await connection.query(
          `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, quantity_before, quantity_after, reference_type, reference_id, remarks, created_by, created_at)
           VALUES (?, 'PURCHASE', ?, ?, ?, 'purchase_order', ?, 'Procured from supplier', ?, NOW())`,
          [item.productId, item.quantity, quantityBefore, quantityAfter, purchaseOrderId, userId || null]
        );
      }

      // 3. Update Purchase Order Total Amount
      await connection.query(
        'UPDATE purchase_orders SET total_amount = ? WHERE id = ?',
        [totalAmount, purchaseOrderId]
      );

      await connection.commit();
      return { purchaseOrderId, totalAmount, status: 'RECEIVED' };
    } catch (error: any) {
      await connection.rollback();
      throw new BadRequestException(error.message || 'Failed to book purchase stock');
    } finally {
      connection.release();
    }
  }

  async getInventoryHistory(query: {
    productId?: string;
    supplierId?: string;
    transactionType?: string;
  }) {
    let sql = `
      SELECT t.id, t.product_id, p.name as product_name, p.barcode,
             t.transaction_type, t.quantity_change, t.quantity_before, t.quantity_after,
             t.reference_type, t.reference_id, t.remarks, t.created_by, u.name as creator_name, t.created_at
      FROM inventory_transactions t
      JOIN products p ON t.product_id = p.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (query.productId) {
      sql += ' AND t.product_id = ?';
      params.push(Number(query.productId));
    }
    if (query.supplierId) {
      sql += ' AND p.supplier_id = ?';
      params.push(Number(query.supplierId));
    }
    if (query.transactionType) {
      sql += ' AND t.transaction_type = ?';
      params.push(query.transactionType);
    }

    sql += ' ORDER BY t.id DESC';

    const [rows] = await this.db.query<RowDataPacket[]>(sql, params);
    return rows.map(r => ({
      id: r.id,
      productId: r.product_id,
      productName: r.product_name,
      barcode: r.barcode,
      transactionType: r.transaction_type,
      quantityChange: r.quantity_change,
      quantityBefore: r.quantity_before,
      quantityAfter: r.quantity_after,
      referenceType: r.reference_type,
      referenceId: r.reference_id,
      remarks: r.remarks,
      createdBy: r.created_by,
      creator: r.creator_name,
      createdAt: r.created_at,
    }));
  }

  async getLowStock() {
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT p.id, p.barcode, p.name, p.stock, p.low_stock_threshold, p.sku, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.stock <= p.low_stock_threshold AND p.is_active = TRUE`
    );
    return rows.map(r => ({
      id: r.id,
      barcode: r.barcode,
      name: r.name,
      stock: r.stock,
      lowStockThreshold: r.low_stock_threshold,
      sku: r.sku,
      category: r.category_name,
    }));
  }

  // ==========================================
  // SALES TRANSACTIONS & BILLING (PHASE 4)
  // ==========================================

  async createSale(dto: CreateSaleDto, userId?: number) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Shopping cart cannot be empty');
    }

    const connection = await this.db.getConnection();
    await connection.beginTransaction();

    try {
      let subtotal = 0;
      const itemsToProcess: { productId: number; quantity: number; sellingPrice: number; oldStock: number; name: string }[] = [];

      // 1. Validate all items and calculate subtotal
      for (const item of dto.items) {
        const [products] = await connection.query<RowDataPacket[]>(
          'SELECT id, name, stock, selling_price, is_active FROM products WHERE id = ? FOR UPDATE',
          [item.productId]
        );

        if (!products.length) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        const product = products[0];
        if (!product.is_active) {
          throw new BadRequestException(`Product "${product.name}" is inactive and cannot be sold`);
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(`Insufficient stock for product "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`);
        }

        const itemTotal = Number(item.quantity) * Number(product.selling_price);
        subtotal += itemTotal;

        itemsToProcess.push({
          productId: item.productId,
          quantity: item.quantity,
          sellingPrice: Number(product.selling_price),
          oldStock: product.stock,
          name: product.name,
        });
      }

      // Calculate total
      const discount = Number(dto.discount || 0);
      const tax = Number(dto.tax || 0);
      const total = Math.max(0, subtotal - discount + tax);

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 2. Create Sale header
      const [saleResult] = await connection.query<ResultSetHeader>(
        `INSERT INTO sales (invoice_number, customer_name, payment_method, subtotal, tax, discount, total, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [invoiceNumber, dto.customerName || 'Walk-in Customer', dto.paymentMethod, subtotal, tax, discount, total]
      );
      const saleId = saleResult.insertId;

      // 3. Create Sale Items, Deduct Stock, and Log Ledger
      for (const item of itemsToProcess) {
        // Create Sale Item
        await connection.query(
          `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price)
           VALUES (?, ?, ?, ?)`,
          [saleId, item.productId, item.quantity, item.sellingPrice]
        );

        // Deduct product stock
        const newStock = item.oldStock - item.quantity;
        await connection.query('UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?', [newStock, item.productId]);

        // Log transaction in the centralized inventory transactions ledger
        await connection.query(
          `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, quantity_before, quantity_after, reference_type, reference_id, remarks, created_by, created_at)
           VALUES (?, 'SALE', ?, ?, ?, 'sales', ?, ?, ?, NOW())`,
          [
            item.productId,
            -item.quantity, // Negative for stock reduction
            item.oldStock,
            newStock,
            saleId,
            `Sold via POS. Invoice: ${invoiceNumber}`,
            userId || null
          ]
        );
      }

      await connection.commit();
      return this.getSaleById(saleId);
    } catch (error: any) {
      await connection.rollback();
      throw new BadRequestException(error.message || 'Failed to complete sale transaction');
    } finally {
      connection.release();
    }
  }

  async getSales(query: {
    invoiceNumber?: string;
    paymentMethod?: string;
  }) {
    let sql = 'SELECT id, invoice_number, customer_name, payment_method, subtotal, tax, discount, total, created_at FROM sales WHERE 1=1';
    const params: any[] = [];

    if (query.invoiceNumber) {
      sql += ' AND invoice_number LIKE ?';
      params.push(`%${query.invoiceNumber}%`);
    }
    if (query.paymentMethod) {
      sql += ' AND payment_method = ?';
      params.push(query.paymentMethod);
    }

    sql += ' ORDER BY id DESC';

    const [rows] = await this.db.query<RowDataPacket[]>(sql, params);
    return rows.map(r => ({
      id: r.id,
      invoiceNumber: r.invoice_number,
      customerName: r.customer_name,
      paymentMethod: r.payment_method,
      subtotal: Number(r.subtotal),
      tax: Number(r.tax),
      discount: Number(r.discount),
      total: Number(r.total),
      createdAt: r.created_at,
    }));
  }

  async getSaleById(id: number) {
    const [sales] = await this.db.query<RowDataPacket[]>('SELECT id, invoice_number, customer_name, payment_method, subtotal, tax, discount, total, created_at FROM sales WHERE id = ? LIMIT 1', [id]);
    if (!sales.length) {
      throw new NotFoundException('Sale not found');
    }
    const sale = sales[0];

    const [items] = await this.db.query<RowDataPacket[]>(
      `SELECT si.product_id, p.name as product_name, p.barcode, si.quantity, si.unit_price, (si.quantity * si.unit_price) as total_price
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?`,
      [id]
    );

    return {
      id: sale.id,
      invoiceNumber: sale.invoice_number,
      customerName: sale.customer_name,
      paymentMethod: sale.payment_method,
      subtotal: Number(sale.subtotal),
      tax: Number(sale.tax),
      discount: Number(sale.discount),
      total: Number(sale.total),
      createdAt: sale.created_at,
      items: items.map(item => ({
        productId: item.product_id,
        productName: item.product_name,
        barcode: item.barcode,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        totalPrice: Number(item.total_price),
      })),
    };
  }
}
