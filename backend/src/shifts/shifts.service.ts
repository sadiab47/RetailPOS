import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Pool, RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { OpenShiftDto, CloseShiftDto, CashMovementDto } from './dto/shifts.dto';

@Injectable()
export class ShiftsService {
  constructor(@Inject('DATABASE_POOL') private readonly db: Pool) {}

  async getActiveShift(userId: number) {
    const [shifts] = await this.db.query<RowDataPacket[]>(
      `SELECT cs.id, cs.register_id, cs.opening_cash as openingCash, cs.opening_time as openingTime, cs.status, r.name as registerName
       FROM cash_shifts cs
       JOIN cash_registers r ON cs.register_id = r.id
       WHERE cs.user_id = ? AND cs.status = 'OPEN' LIMIT 1`,
      [userId]
    );

    if (shifts.length === 0) {
      return null;
    }
    return shifts[0];
  }

  async openShift(userId: number, dto: OpenShiftDto) {
    if (dto.openingCash < 0) {
      throw new BadRequestException('Opening cash cannot be negative');
    }

    // Check user active shift
    const userActive = await this.getActiveShift(userId);
    if (userActive) {
      throw new BadRequestException('You already have an active open shift');
    }

    // Check register active shift
    const [registerShifts] = await this.db.query<RowDataPacket[]>(
      'SELECT id FROM cash_shifts WHERE register_id = ? AND status = "OPEN" LIMIT 1',
      [dto.registerId]
    );
    if (registerShifts.length > 0) {
      throw new BadRequestException('Register already has an active open shift');
    }

    // Check register status
    const [registers] = await this.db.query<RowDataPacket[]>(
      'SELECT status FROM cash_registers WHERE id = ? LIMIT 1',
      [dto.registerId]
    );
    if (registers.length === 0) {
      throw new NotFoundException('Cash Register not found');
    }
    if (registers[0].status !== 'ACTIVE') {
      throw new BadRequestException('Register is currently unavailable or under maintenance');
    }

    const connection = await this.db.getConnection();
    await connection.beginTransaction();

    try {
      // Insert Cash Shift
      const [shiftResult] = await connection.query<ResultSetHeader>(
        `INSERT INTO cash_shifts (register_id, user_id, opening_cash, status, opening_time)
         VALUES (?, ?, ?, 'OPEN', NOW())`,
        [dto.registerId, userId, dto.openingCash]
      );
      const shiftId = shiftResult.insertId;

      // Log Opening Movement
      await connection.query(
        `INSERT INTO cash_movements (shift_id, amount, type, remarks, created_by, created_at)
         VALUES (?, ?, 'OPENING', 'Opening cash float', ?, NOW())`,
        [shiftId, dto.openingCash, userId]
      );

      await connection.commit();
      return this.getActiveShift(userId);
    } catch (err: any) {
      await connection.rollback();
      throw new BadRequestException(err.message || 'Failed to open shift');
    } finally {
      connection.release();
    }
  }

  async logMovement(
    shiftId: number,
    amount: number,
    type: string,
    refType?: string | null,
    refId?: number | null,
    remarks?: string | null,
    userId?: number | null,
    conn?: PoolConnection
  ) {
    const runQuery = conn ? conn.query.bind(conn) : this.db.query.bind(this.db);
    await runQuery(
      `INSERT INTO cash_movements (shift_id, amount, type, reference_type, reference_id, remarks, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [shiftId, amount, type, refType || null, refId || null, remarks || null, userId || null]
    );
  }

  async addManualMovement(userId: number, dto: CashMovementDto) {
    const shift = await this.getActiveShift(userId);
    if (!shift) {
      throw new BadRequestException('No active open shift found');
    }

    // Determine correct positive/negative sign based on movement type
    let finalAmount = Number(dto.amount);
    if (['CASH_OUT', 'SAFE_DROP', 'BANK_DEPOSIT'].includes(dto.type)) {
      finalAmount = -Math.abs(finalAmount);
    } else {
      finalAmount = Math.abs(finalAmount);
    }

    await this.logMovement(
      shift.id,
      finalAmount,
      dto.type,
      null,
      null,
      dto.remarks || null,
      userId
    );

    return { success: true };
  }

  async closeShift(userId: number, dto: CloseShiftDto) {
    const shift = await this.getActiveShift(userId);
    if (!shift) {
      throw new BadRequestException('No active open shift found');
    }

    // Calculate Expected Cash: SUM(amount) of all movements
    const [movementsSum] = await this.db.query<RowDataPacket[]>(
      'SELECT SUM(amount) as expected FROM cash_movements WHERE shift_id = ?',
      [shift.id]
    );
    const expectedCash = Number(movementsSum[0]?.expected || 0);
    const variance = Number(dto.actualCash) - expectedCash;

    const connection = await this.db.getConnection();
    await connection.beginTransaction();

    try {
      // Log Closing Movement (0 value, just for shift logging check)
      await connection.query(
        `INSERT INTO cash_movements (shift_id, amount, type, remarks, created_by, created_at)
         VALUES (?, 0, 'CLOSING', 'Closing shift reconciliation', ?, NOW())`,
        [shift.id, userId]
      );

      // Close Shift
      await connection.query(
        `UPDATE cash_shifts
         SET closing_time = NOW(), closing_cash = ?, expected_cash = ?, actual_cash = ?, variance = ?, status = 'CLOSED', notes = ?
         WHERE id = ?`,
        [dto.actualCash, expectedCash, dto.actualCash, variance, dto.notes || null, shift.id]
      );

      await connection.commit();
      return this.getShiftSummary(shift.id);
    } catch (err: any) {
      await connection.rollback();
      throw new BadRequestException(err.message || 'Failed to close shift');
    } finally {
      connection.release();
    }
  }

  async getShiftSummary(shiftId: number) {
    const [shifts] = await this.db.query<RowDataPacket[]>(
      `SELECT cs.id, cs.register_id, cs.user_id, cs.opening_time as openingTime, cs.closing_time as closingTime,
              cs.opening_cash as openingCash, cs.closing_cash as closingCash, cs.expected_cash as expectedCash,
              cs.actual_cash as actualCash, cs.variance, cs.status, cs.notes,
              r.name as registerName, u.name as cashierName
       FROM cash_shifts cs
       JOIN cash_registers r ON cs.register_id = r.id
       JOIN users u ON cs.user_id = u.id
       WHERE cs.id = ? LIMIT 1`,
      [shiftId]
    );

    if (shifts.length === 0) {
      throw new NotFoundException('Shift record not found');
    }

    const s = shifts[0];

    // Query cash movements details
    const [movements] = await this.db.query<RowDataPacket[]>(
      `SELECT id, amount, type, reference_type as referenceType, reference_id as referenceId, remarks, created_at as createdAt
       FROM cash_movements
       WHERE shift_id = ?
       ORDER BY id ASC`,
      [shiftId]
    );

    // Calculate aggregations dynamically
    let cashSales = 0;
    let cashReturns = 0;
    let safeDrops = 0;
    let cashIn = 0;
    let cashOut = 0;
    let bankDeposits = 0;
    let adjustments = 0;

    movements.forEach((m) => {
      const amt = Number(m.amount);
      if (m.type === 'SALE') cashSales += amt;
      else if (m.type === 'RETURN') cashReturns += Math.abs(amt);
      else if (m.type === 'SAFE_DROP') safeDrops += Math.abs(amt);
      else if (m.type === 'CASH_IN') cashIn += amt;
      else if (m.type === 'CASH_OUT') cashOut += Math.abs(amt);
      else if (m.type === 'BANK_DEPOSIT') bankDeposits += Math.abs(amt);
      else if (m.type === 'ADJUSTMENT') adjustments += amt;
    });

    const [txCount] = await this.db.query<RowDataPacket[]>(
      'SELECT COUNT(id) as count FROM cash_movements WHERE shift_id = ? AND type IN ("SALE", "RETURN")',
      [shiftId]
    );

    // Current expected cash computed dynamically
    const [currentSum] = await this.db.query<RowDataPacket[]>(
      'SELECT SUM(amount) as current FROM cash_movements WHERE shift_id = ?',
      [shiftId]
    );

    return {
      id: s.id,
      registerId: s.register_id,
      registerName: s.registerName,
      cashierName: s.cashierName,
      openingTime: s.openingTime,
      closingTime: s.closingTime,
      openingCash: Number(s.openingCash),
      closingCash: s.closingCash !== null ? Number(s.closingCash) : null,
      expectedCash: s.expectedCash !== null ? Number(s.expectedCash) : Number(currentSum[0]?.current || 0),
      actualCash: s.actualCash !== null ? Number(s.actualCash) : null,
      variance: s.variance !== null ? Number(s.variance) : null,
      status: s.status,
      notes: s.notes,
      aggregations: {
        cashSales,
        cashReturns,
        safeDrops,
        cashIn,
        cashOut,
        bankDeposits,
        adjustments,
        totalTransactions: Number(txCount[0]?.count || 0),
      },
      movements: movements.map((m) => ({
        id: m.id,
        amount: Number(m.amount),
        type: m.type,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        remarks: m.remarks,
        createdAt: m.createdAt,
      })),
    };
  }

  async getRegisters() {
    const [rows] = await this.db.query<RowDataPacket[]>(
      'SELECT id, name, status FROM cash_registers ORDER BY id ASC'
    );
    return rows;
  }
}
