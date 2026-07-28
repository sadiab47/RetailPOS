import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { CreateReturnDto } from './dto/returns.dto';

@Injectable()
export class ReturnsService {
  constructor(@Inject('DATABASE_POOL') private readonly db: Pool) {}

  async createReturn(dto: CreateReturnDto, userId?: number) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Returns list cannot be empty');
    }

    const connection = await this.db.getConnection();
    await connection.beginTransaction();

    try {
      if (dto.refundMethod === 'CASH') {
        const [shifts] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM cash_shifts WHERE user_id = ? AND status = "OPEN" LIMIT 1',
          [userId]
        );
        if (shifts.length === 0) {
          throw new BadRequestException('An active cash register shift must be open to process CASH refunds');
        }
      }

      // 1. Fetch original sale details
      const [sales] = await connection.query<RowDataPacket[]>(
        'SELECT id, total, customer_id, customer_name FROM sales WHERE id = ? LIMIT 1',
        [dto.saleId]
      );
      if (sales.length === 0) {
        throw new NotFoundException('Original sale invoice not found');
      }
      const sale = sales[0];

      // 2. Fetch original sale items
      const [saleItems] = await connection.query<RowDataPacket[]>(
        'SELECT id, product_id, quantity, unit_price FROM sale_items WHERE sale_id = ?',
        [dto.saleId]
      );

      // 3. Fetch previously returned quantities
      const [prevReturns] = await connection.query<RowDataPacket[]>(
        `SELECT sri.sale_item_id, SUM(sri.quantity) as returned_qty
         FROM sales_return_items sri
         JOIN sales_returns sr ON sri.return_id = sr.id
         WHERE sr.sale_id = ? AND sr.status != 'VOIDED'
         GROUP BY sri.sale_item_id`,
        [dto.saleId]
      );

      const prevReturnMap = new Map<number, number>();
      prevReturns.forEach((r) => {
        prevReturnMap.set(r.sale_item_id, Number(r.returned_qty));
      });

      let calculatedRefundTotal = 0;
      const itemsToProcess: { saleItemId: number; productId: number; quantity: number; unitPrice: number; oldStock: number; productName: string }[] = [];

      // 4. Validate return quantities
      for (const item of dto.items) {
        const originalItem = saleItems.find((si) => si.id === item.saleItemId);
        if (!originalItem) {
          throw new BadRequestException(`Item with ID ${item.saleItemId} does not belong to this sale`);
        }

        const returnedQty = prevReturnMap.get(item.saleItemId) || 0;
        const availableReturnQty = originalItem.quantity - returnedQty;

        if (item.quantity <= 0) {
          throw new BadRequestException('Return quantity must be positive');
        }

        if (item.quantity > availableReturnQty) {
          throw new BadRequestException(
            `Cannot return quantity ${item.quantity}. Max returnable quantity left is ${availableReturnQty}`
          );
        }

        // Fetch product details for inventory logs
        const [products] = await connection.query<RowDataPacket[]>(
          'SELECT name, stock FROM products WHERE id = ? LIMIT 1',
          [item.productId]
        );
        if (products.length === 0) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        const itemRefund = Number(item.quantity) * Number(originalItem.unit_price);
        calculatedRefundTotal += itemRefund;

        itemsToProcess.push({
          saleItemId: item.saleItemId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(originalItem.unit_price),
          oldStock: products[0].stock,
          productName: products[0].name,
        });
      }

      // Generate unique return number
      const returnNumber = `RET-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 5. Insert return header
      const [returnResult] = await connection.query<ResultSetHeader>(
        `INSERT INTO sales_returns (sale_id, return_number, status, reason_code, reason_notes, refund_amount, refund_method, created_by, created_at)
         VALUES (?, ?, 'COMPLETED', ?, ?, ?, ?, ?, NOW())`,
        [
          dto.saleId,
          returnNumber,
          dto.reasonCode,
          dto.reasonNotes || null,
          calculatedRefundTotal,
          dto.refundMethod,
          userId || null,
        ]
      );
      const returnId = returnResult.insertId;

      // 6. Process items (Stock Restoring, Ledger logs, Returns items insert)
      for (const item of itemsToProcess) {
        // Insert Return Item
        await connection.query(
          `INSERT INTO sales_return_items (return_id, sale_item_id, product_id, quantity, unit_price)
           VALUES (?, ?, ?, ?, ?)`,
          [returnId, item.saleItemId, item.productId, item.quantity, item.unitPrice]
        );

        // Update product stock level
        const newStock = item.oldStock + item.quantity;
        await connection.query(
          'UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?',
          [newStock, item.productId]
        );

        // Log transaction in inventory ledger as SALE_RETURN
        await connection.query(
          `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, quantity_before, quantity_after, reference_type, reference_id, remarks, created_by, created_at)
           VALUES (?, 'SALE_RETURN', ?, ?, ?, 'sales_returns', ?, ?, ?, NOW())`,
          [
            item.productId,
            item.quantity, // Positive change since stock is restored
            item.oldStock,
            newStock,
            returnId,
            `Stock restored from return ${returnNumber}`,
            userId || null,
          ]
        );
      }

      // 7. Adjust Customer Balances
      if (sale.customer_id) {
        // Loyalty Point Reversal
        const originalSaleTotal = Number(sale.total);
        if (originalSaleTotal > 0) {
          const originalEarnedPoints = Math.floor(originalSaleTotal / 100);
          const pointsToReverse = Math.floor(originalEarnedPoints * (calculatedRefundTotal / originalSaleTotal));

          if (pointsToReverse > 0) {
            await connection.query(
              `INSERT INTO customer_loyalty_ledger (customer_id, points_change, transaction_type, reference_type, reference_id, remarks, created_at)
               VALUES (?, ?, 'ADJUSTED', 'sales_returns', ?, ?, NOW())`,
              [
                sale.customer_id,
                -pointsToReverse,
                returnId,
                `Points reversed from return ${returnNumber}`,
              ]
            );
            await connection.query(
              'UPDATE customers SET loyalty_points = loyalty_points - ? WHERE id = ?',
              [pointsToReverse, sale.customer_id]
            );
          }
        }

        // Store credit refund
        if (dto.refundMethod === 'STORE_CREDIT') {
          // Subtract from customer's outstanding balance (using negative value)
          await connection.query(
            `INSERT INTO customer_credit_ledger (customer_id, amount_change, transaction_type, reference_type, reference_id, remarks, created_by, created_at)
             VALUES (?, ?, 'ADJUSTMENT', 'sales_returns', ?, ?, ?, NOW())`,
            [
              sale.customer_id,
              -calculatedRefundTotal,
              returnId,
              `Store credit issued from return ${returnNumber}`,
              userId || null,
            ]
          );
          await connection.query(
            'UPDATE customers SET outstanding_balance = outstanding_balance - ? WHERE id = ?',
            [calculatedRefundTotal, sale.customer_id]
          );
        }
      } else if (dto.refundMethod === 'STORE_CREDIT') {
        throw new BadRequestException('Cannot issue STORE_CREDIT to a Walk-in Customer');
      }

      if (dto.refundMethod === 'CASH') {
        const [shifts] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM cash_shifts WHERE user_id = ? AND status = "OPEN" LIMIT 1',
          [userId]
        );
        const shiftId = shifts[0].id;
        await connection.query(
          `INSERT INTO cash_movements (shift_id, amount, type, reference_type, reference_id, remarks, created_by, created_at)
           VALUES (?, ?, 'RETURN', 'sales_returns', ?, 'Sale return cash refund', ?, NOW())`,
          [shiftId, -calculatedRefundTotal, returnId, userId || null]
        );
      }

      await connection.commit();
      return this.getReturnById(returnId);
    } catch (err: any) {
      await connection.rollback();
      throw new BadRequestException(err.message || 'Failed to process return');
    } finally {
      connection.release();
    }
  }

  async getReturns() {
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT sr.id, sr.return_number, sr.status, sr.reason_code, sr.refund_amount, sr.refund_method, sr.created_at, s.invoice_number, s.customer_name
       FROM sales_returns sr
       JOIN sales s ON sr.sale_id = s.id
       ORDER BY sr.id DESC`
    );
    return rows.map((r) => ({
      id: r.id,
      returnNumber: r.return_number,
      status: r.status,
      reasonCode: r.reason_code,
      refundAmount: Number(r.refund_amount),
      refundMethod: r.refund_method,
      createdAt: r.created_at,
      invoiceNumber: r.invoice_number,
      customerName: r.customer_name,
    }));
  }

  async getReturnById(id: number) {
    const [returns] = await this.db.query<RowDataPacket[]>(
      `SELECT sr.id, sr.sale_id, sr.return_number, sr.status, sr.reason_code, sr.reason_notes, sr.refund_amount, sr.refund_method, sr.created_at, s.invoice_number, s.customer_name, u.name as cashier_name
       FROM sales_returns sr
       JOIN sales s ON sr.sale_id = s.id
       LEFT JOIN users u ON sr.created_by = u.id
       WHERE sr.id = ? LIMIT 1`,
      [id]
    );

    if (returns.length === 0) {
      throw new NotFoundException('Return record not found');
    }

    const ret = returns[0];
    const [items] = await this.db.query<RowDataPacket[]>(
      `SELECT sri.id, sri.product_id, p.name as product_name, p.barcode, sri.quantity, sri.unit_price, (sri.quantity * sri.unit_price) as total_price
       FROM sales_return_items sri
       JOIN products p ON sri.product_id = p.id
       WHERE sri.return_id = ?`,
      [id]
    );

    return {
      id: ret.id,
      saleId: ret.sale_id,
      returnNumber: ret.return_number,
      status: ret.status,
      reasonCode: ret.reason_code,
      reasonNotes: ret.reason_notes,
      refundAmount: Number(ret.refund_amount),
      refundMethod: ret.refund_method,
      createdAt: ret.created_at,
      invoiceNumber: ret.invoice_number,
      customerName: ret.customer_name,
      cashierName: ret.cashier_name || 'System',
      items: items.map((i) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name,
        barcode: i.barcode,
        quantity: i.quantity,
        unitPrice: Number(i.unit_price),
        totalPrice: Number(i.total_price),
      })),
    };
  }
}
