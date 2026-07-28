import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(@Inject('DATABASE_POOL') private readonly db: Pool) {}

  async createCustomer(dto: CreateCustomerDto, userId?: number) {
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName?.trim() || null;
    const phone = dto.phone.trim();
    const email = dto.email?.trim() || null;
    const address = dto.address?.trim() || null;
    const dateOfBirth = dto.dateOfBirth || null;
    const notes = dto.notes?.trim() || null;
    const creditLimit = Number(dto.creditLimit || 0);

    // 1. Validate uniqueness
    const [existingPhone] = await this.db.query<RowDataPacket[]>(
      'SELECT id FROM customers WHERE phone = ? LIMIT 1',
      [phone]
    );
    if (existingPhone.length > 0) {
      throw new BadRequestException(`Customer with phone number "${phone}" already exists`);
    }

    if (email) {
      const [existingEmail] = await this.db.query<RowDataPacket[]>(
        'SELECT id FROM customers WHERE email = ? LIMIT 1',
        [email]
      );
      if (existingEmail.length > 0) {
        throw new BadRequestException(`Customer with email "${email}" already exists`);
      }
    }

    const connection = await this.db.getConnection();
    await connection.beginTransaction();

    try {
      // 2. Generate customer code (CUS-000001 format)
      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT IFNULL(MAX(id), 0) + 1 AS nextId FROM customers'
      );
      const nextId = rows[0].nextId;
      const customerCode = `CUS-${String(nextId).padStart(6, '0')}`;

      // 3. Insert customer
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO customers (customer_code, first_name, last_name, phone, email, address, date_of_birth, notes, loyalty_points, credit_limit, outstanding_balance, is_active, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, TRUE, ?, NOW(), NOW())`,
        [customerCode, firstName, lastName, phone, email, address, dateOfBirth, notes, creditLimit, userId || null]
      );

      await connection.commit();
      return this.getCustomerById(result.insertId);
    } catch (err: any) {
      await connection.rollback();
      throw new BadRequestException(err.message || 'Failed to create customer');
    } finally {
      connection.release();
    }
  }

  async updateCustomer(id: number, dto: UpdateCustomerDto) {
    const [existing] = await this.db.query<RowDataPacket[]>(
      'SELECT id, phone, email FROM customers WHERE id = ? LIMIT 1',
      [id]
    );

    if (existing.length === 0) {
      throw new NotFoundException('Customer not found');
    }

    const current = existing[0];
    const updates: string[] = [];
    const params: any[] = [];

    if (dto.firstName !== undefined) {
      updates.push('first_name = ?');
      params.push(dto.firstName.trim());
    }

    if (dto.lastName !== undefined) {
      updates.push('last_name = ?');
      params.push(dto.lastName?.trim() || null);
    }

    if (dto.phone !== undefined) {
      const phone = dto.phone.trim();
      if (phone !== current.phone) {
        const [dupPhone] = await this.db.query<RowDataPacket[]>(
          'SELECT id FROM customers WHERE phone = ? AND id != ? LIMIT 1',
          [phone, id]
        );
        if (dupPhone.length > 0) {
          throw new BadRequestException(`Customer with phone number "${phone}" already exists`);
        }
      }
      updates.push('phone = ?');
      params.push(phone);
    }

    if (dto.email !== undefined) {
      const email = dto.email?.trim() || null;
      if (email && email !== current.email) {
        const [dupEmail] = await this.db.query<RowDataPacket[]>(
          'SELECT id FROM customers WHERE email = ? AND id != ? LIMIT 1',
          [email, id]
        );
        if (dupEmail.length > 0) {
          throw new BadRequestException(`Customer with email "${email}" already exists`);
        }
      }
      updates.push('email = ?');
      params.push(email);
    }

    if (dto.address !== undefined) {
      updates.push('address = ?');
      params.push(dto.address?.trim() || null);
    }

    if (dto.dateOfBirth !== undefined) {
      updates.push('date_of_birth = ?');
      params.push(dto.dateOfBirth || null);
    }

    if (dto.notes !== undefined) {
      updates.push('notes = ?');
      params.push(dto.notes?.trim() || null);
    }

    if (dto.creditLimit !== undefined) {
      updates.push('credit_limit = ?');
      params.push(Number(dto.creditLimit || 0));
    }

    if (dto.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(dto.isActive);
    }

    if (updates.length === 0) {
      return this.getCustomerById(id);
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await this.db.query(
      `UPDATE customers SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getCustomerById(id);
  }

  async getCustomers(query: { search?: string; phone?: string; code?: string }) {
    let sql = `
      SELECT c.*, MAX(s.created_at) as last_purchase_date, COUNT(s.id) as total_purchases, IFNULL(SUM(s.total), 0) as total_spent
      FROM customers c
      LEFT JOIN sales s ON c.id = s.customer_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (query.phone) {
      sql += ' AND c.phone = ?';
      params.push(query.phone.trim());
    }

    if (query.code) {
      sql += ' AND c.customer_code = ?';
      params.push(query.code.trim());
    }

    if (query.search) {
      const searchVal = `%${query.search.trim()}%`;
      sql += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.phone LIKE ? OR c.customer_code LIKE ? OR c.email LIKE ?)';
      params.push(searchVal, searchVal, searchVal, searchVal, searchVal);
    }

    sql += ' GROUP BY c.id ORDER BY c.id DESC';

    const [rows] = await this.db.query<RowDataPacket[]>(sql, params);
    return rows.map(r => ({
      id: r.id,
      customerCode: r.customer_code,
      firstName: r.first_name,
      lastName: r.last_name,
      phone: r.phone,
      email: r.email,
      address: r.address,
      dateOfBirth: r.date_of_birth,
      notes: r.notes,
      loyaltyPoints: r.loyalty_points,
      creditLimit: Number(r.credit_limit),
      outstandingBalance: Number(r.outstanding_balance),
      isActive: Boolean(r.is_active),
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      stats: {
        lastPurchaseDate: r.last_purchase_date,
        totalPurchases: Number(r.total_purchases),
        totalSpent: Number(r.total_spent),
      }
    }));
  }

  async getCustomerById(id: number) {
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT c.*, MAX(s.created_at) as last_purchase_date, COUNT(s.id) as total_purchases, IFNULL(SUM(s.total), 0) as total_spent
       FROM customers c
       LEFT JOIN sales s ON c.id = s.customer_id
       WHERE c.id = ?
       GROUP BY c.id
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      throw new NotFoundException('Customer not found');
    }

    const r = rows[0];
    return {
      id: r.id,
      customerCode: r.customer_code,
      firstName: r.first_name,
      lastName: r.last_name,
      phone: r.phone,
      email: r.email,
      address: r.address,
      dateOfBirth: r.date_of_birth,
      notes: r.notes,
      loyaltyPoints: r.loyalty_points,
      creditLimit: Number(r.credit_limit),
      outstandingBalance: Number(r.outstanding_balance),
      isActive: Boolean(r.is_active),
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      stats: {
        lastPurchaseDate: r.last_purchase_date,
        totalPurchases: Number(r.total_purchases),
        totalSpent: Number(r.total_spent),
      }
    };
  }

  async deleteCustomer(id: number) {
    const [existing] = await this.db.query<RowDataPacket[]>(
      'SELECT id FROM customers WHERE id = ? LIMIT 1',
      [id]
    );
    if (existing.length === 0) {
      throw new NotFoundException('Customer not found');
    }

    // Set sales customer_id reference to NULL to maintain integrity (SQL foreign key ON DELETE SET NULL does this automatically, but let's run the delete)
    await this.db.query('DELETE FROM customers WHERE id = ?', [id]);
    return { success: true, message: 'Customer profile deleted' };
  }
}
