import { Inject, Injectable } from '@nestjs/common';
import { Pool, RowDataPacket } from 'mysql2/promise';

@Injectable()
export class ReportsService {
  constructor(@Inject('DATABASE_POOL') private readonly db: Pool) {}

  async getDashboardStats() {
    // 1. Sales stats (Today, Yesterday, MTD)
    const [todaySales] = await this.db.query<RowDataPacket[]>(
      'SELECT COALESCE(SUM(total), 0) as revenue, COUNT(id) as count FROM sales WHERE DATE(created_at) = CURDATE()'
    );
    const [yesterdaySales] = await this.db.query<RowDataPacket[]>(
      'SELECT COALESCE(SUM(total), 0) as revenue FROM sales WHERE DATE(created_at) = SUBDATE(CURDATE(), 1)'
    );
    const [mtdSales] = await this.db.query<RowDataPacket[]>(
      'SELECT COALESCE(SUM(total), 0) as revenue FROM sales WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())'
    );
    const [avgSale] = await this.db.query<RowDataPacket[]>(
      'SELECT COALESCE(AVG(total), 0) as avgSale, COUNT(id) as totalTransactions FROM sales'
    );
    const [refundStats] = await this.db.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(refund_amount), 0) as totalRefunds,
              (SELECT COALESCE(SUM(total), 0) FROM sales) as totalSales
       FROM sales_returns`
    );

    const refundSalesVal = Number(refundStats[0]?.totalSales || 0);
    const refundPct = refundSalesVal > 0 ? (Number(refundStats[0]?.totalRefunds) / refundSalesVal) * 100 : 0;

    // 2. Today's Profit margin
    const [todayProfit] = await this.db.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM((si.unit_price - p.cost_price) * si.quantity), 0) as profit,
              COALESCE(SUM(si.unit_price * si.quantity), 0) as revenue
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       JOIN sales s ON si.sale_id = s.id
       WHERE DATE(s.created_at) = CURDATE()`
    );

    const profitVal = Number(todayProfit[0]?.profit || 0);
    const profitRevenue = Number(todayProfit[0]?.revenue || 0);
    const profitMarginPct = profitRevenue > 0 ? (profitVal / profitRevenue) * 100 : 0;

    // 3. Inventory counters
    const [lowStock] = await this.db.query<RowDataPacket[]>(
      'SELECT COUNT(id) as count FROM products WHERE stock <= low_stock_threshold AND is_active = 1'
    );
    const [outOfStock] = await this.db.query<RowDataPacket[]>(
      'SELECT COUNT(id) as count FROM products WHERE stock = 0 AND is_active = 1'
    );

    // 4. Customers metrics
    const [customersCount] = await this.db.query<RowDataPacket[]>(
      `SELECT COUNT(id) as totalMembers,
              (SELECT COUNT(id) FROM customers WHERE DATE(created_at) = CURDATE()) as newToday,
              COALESCE(SUM(outstanding_balance), 0) as totalCredit
       FROM customers`
    );

    // 5. Active shifts
    const [activeShifts] = await this.db.query<RowDataPacket[]>(
      'SELECT COUNT(id) as count FROM cash_shifts WHERE status = "OPEN"'
    );

    return {
      sales: {
        todaySales: Number(todaySales[0]?.revenue || 0),
        todayTransactions: Number(todaySales[0]?.count || 0),
        yesterdaySales: Number(yesterdaySales[0]?.revenue || 0),
        mtdSales: Number(mtdSales[0]?.revenue || 0),
        avgSaleValue: Number(avgSale[0]?.avgSale || 0),
        totalTransactions: Number(avgSale[0]?.totalTransactions || 0),
        refundPercentage: refundPct,
        profit: profitVal,
        profitMarginPct,
      },
      inventory: {
        lowStockCount: Number(lowStock[0]?.count || 0),
        outOfStockCount: Number(outOfStock[0]?.count || 0),
      },
      customers: {
        newCustomersToday: Number(customersCount[0]?.newToday || 0),
        loyaltyMembers: Number(customersCount[0]?.totalMembers || 0),
        outstandingCredit: Number(customersCount[0]?.totalCredit || 0),
      },
      cash: {
        activeShifts: Number(activeShifts[0]?.count || 0),
      },
    };
  }

  async getInventoryValuation() {
    const [valuation] = await this.db.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(cost_price * stock), 0) as costVal,
              COALESCE(SUM(selling_price * stock), 0) as retailVal
       FROM products
       WHERE is_active = 1`
    );

    const costVal = Number(valuation[0]?.costVal || 0);
    const retailVal = Number(valuation[0]?.retailVal || 0);
    const marginPotential = retailVal - costVal;
    const marginPotentialPct = retailVal > 0 ? (marginPotential / retailVal) * 100 : 0;

    // Fast-moving products (last 30 days)
    const [fastMoving] = await this.db.query<RowDataPacket[]>(
      `SELECT p.name, p.barcode, SUM(si.quantity) as qtySold, SUM(si.quantity * si.unit_price) as revenue
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       JOIN sales s ON si.sale_id = s.id
       WHERE s.created_at >= SUBDATE(NOW(), 30)
       GROUP BY p.id
       ORDER BY qtySold DESC
       LIMIT 5`
    );

    // Slow-moving products (stock > 0, low sales last 30 days)
    const [slowMoving] = await this.db.query<RowDataPacket[]>(
      `SELECT p.name, p.barcode, p.stock, COALESCE(SUM(si.quantity), 0) as qtySold
       FROM products p
       LEFT JOIN sale_items si ON si.product_id = p.id
       LEFT JOIN sales s ON si.sale_id = s.id AND s.created_at >= SUBDATE(NOW(), 30)
       WHERE p.stock > 0 AND p.is_active = 1
       GROUP BY p.id
       ORDER BY qtySold ASC, p.stock DESC
       LIMIT 5`
    );

    return {
      costVal,
      retailVal,
      marginPotential,
      marginPotentialPct,
      fastMoving: fastMoving.map((p) => ({
        name: p.name,
        barcode: p.barcode,
        qtySold: Number(p.qtySold),
        revenue: Number(p.revenue),
      })),
      slowMoving: slowMoving.map((p) => ({
        name: p.name,
        barcode: p.barcode,
        stock: p.stock,
        qtySold: Number(p.qtySold),
      })),
    };
  }

  async getSalesReports(groupBy: string, startDate?: string, endDate?: string) {
    let selectExpr = '';
    let groupExpr = '';

    switch (groupBy) {
      case 'day':
        selectExpr = 'DATE(s.created_at) as label';
        groupExpr = 'DATE(s.created_at)';
        break;
      case 'week':
        selectExpr = 'YEARWEEK(s.created_at) as label';
        groupExpr = 'YEARWEEK(s.created_at)';
        break;
      case 'month':
        selectExpr = 'DATE_FORMAT(s.created_at, "%Y-%m") as label';
        groupExpr = 'DATE_FORMAT(s.created_at, "%Y-%m")';
        break;
      case 'cashier':
        selectExpr = 'COALESCE(u.name, "System / Offline") as label';
        groupExpr = 'u.id';
        break;
      case 'register':
        selectExpr = 'COALESCE(cr.name, "Main Drawer") as label';
        groupExpr = 'cr.id';
        break;
      case 'payment_method':
        selectExpr = 's.payment_method as label';
        groupExpr = 's.payment_method';
        break;
      case 'product':
        selectExpr = 'p.name as label';
        groupExpr = 'p.id';
        break;
      case 'category':
        selectExpr = 'COALESCE(cat.name, "Uncategorized") as label';
        groupExpr = 'cat.id';
        break;
      case 'customer':
        selectExpr = 's.customer_name as label';
        groupExpr = 's.customer_name';
        break;
      default:
        selectExpr = 'DATE(s.created_at) as label';
        groupExpr = 'DATE(s.created_at)';
    }

    let dateFilter = '';
    const params: any[] = [];
    if (startDate) {
      dateFilter += ' AND s.created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      dateFilter += ' AND s.created_at <= ?';
      params.push(endDate);
    }

    const query = `
      SELECT ${selectExpr}, COUNT(DISTINCT s.id) as transactions, SUM(s.total) as revenue,
             SUM((si.unit_price - p.cost_price) * si.quantity) as profit
      FROM sales s
      LEFT JOIN sale_items si ON si.sale_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      LEFT JOIN cash_movements cm ON cm.reference_type = 'sales' AND cm.reference_id = s.id AND cm.type = 'SALE'
      LEFT JOIN cash_shifts cs ON cm.shift_id = cs.id
      LEFT JOIN users u ON cs.user_id = u.id
      LEFT JOIN cash_registers cr ON cs.register_id = cr.id
      WHERE 1=1 ${dateFilter}
      GROUP BY ${groupExpr}
      ORDER BY revenue DESC
    `;

    const [rows] = await this.db.query<RowDataPacket[]>(query, params);
    return rows.map((r) => ({
      label: r.label,
      transactions: Number(r.transactions),
      revenue: Number(r.revenue),
      profit: Number(r.profit),
      marginPct: Number(r.revenue) > 0 ? (Number(r.profit) / Number(r.revenue)) * 100 : 0,
    }));
  }

  async getCustomerReports() {
    const [topCustomers] = await this.db.query<RowDataPacket[]>(
      `SELECT c.id, c.customer_code as code, c.first_name as firstName, c.last_name as lastName,
              c.loyalty_points as loyaltyPoints, c.outstanding_balance as outstandingBalance,
              COUNT(s.id) as totalVisits, COALESCE(SUM(s.total), 0) as totalSpent
       FROM customers c
       LEFT JOIN sales s ON s.customer_id = c.id
       GROUP BY c.id
       ORDER BY totalSpent DESC
       LIMIT 10`
    );

    return {
      topSpenders: topCustomers.map((c) => ({
        id: c.id,
        code: c.code,
        name: `${c.firstName} ${c.lastName || ''}`.trim(),
        loyaltyPoints: c.loyaltyPoints,
        outstandingBalance: Number(c.outstandingBalance),
        totalVisits: c.totalVisits,
        totalSpent: Number(c.totalSpent),
      })),
    };
  }

  async getAuditLogs(filters: {
    userId?: number;
    action?: string;
    module?: string;
    startDate?: string;
    endDate?: string;
  }) {
    let sql = `
      SELECT al.id, al.request_id as requestId, al.entity_type as entityType, al.entity_id as entityId,
             al.action, al.module, al.old_values as oldValues, al.new_values as newValues,
             al.ip_address as ipAddress, al.user_agent as userAgent, al.created_at as createdAt,
             u.name as userName, u.email as userEmail
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.userId) {
      sql += ' AND al.user_id = ?';
      params.push(filters.userId);
    }
    if (filters.action) {
      sql += ' AND al.action = ?';
      params.push(filters.action);
    }
    if (filters.module) {
      sql += ' AND al.module = ?';
      params.push(filters.module);
    }
    if (filters.startDate) {
      sql += ' AND al.created_at >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      sql += ' AND al.created_at <= ?';
      params.push(filters.endDate);
    }

    sql += ' ORDER BY al.id DESC LIMIT 100';

    const [rows] = await this.db.query<RowDataPacket[]>(sql, params);
    return rows.map((r) => ({
      id: r.id,
      requestId: r.requestId,
      entityType: r.entityType,
      entityId: r.entityId,
      action: r.action,
      module: r.module,
      oldValues: r.oldValues ? JSON.parse(r.oldValues) : null,
      newValues: r.newValues ? JSON.parse(r.newValues) : null,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      createdAt: r.createdAt,
      userName: r.userName || 'System / Anonymous',
      userEmail: r.userEmail,
    }));
  }
}
