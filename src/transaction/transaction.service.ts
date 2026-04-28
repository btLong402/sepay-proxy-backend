import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetTransactionsDto } from './dto/get-transactions.dto';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async getTransactions(userId: string, query: GetTransactionsDto) {
    const { limit = 20, cursor, fromDate, toDate } = query;

    const where: any = {
      userId,
      deletedAt: null,
    };

    if (fromDate || toDate) {
      where.transferDate = {};
      if (fromDate) where.transferDate.gte = new Date(fromDate);
      if (toDate) where.transferDate.lte = new Date(toDate);
    }

    const items = await this.prisma.transaction.findMany({
      where,
      take: limit + 1, // Lấy thêm 1 bản ghi để check hasMore
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { transferDate: 'desc' },
    });

    const hasMore = items.length > limit;
    if (hasMore) {
      items.pop(); // Bỏ bản ghi thừa
    }

    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      success: true,
      data: items,
      meta: {
        cursor: nextCursor,
        hasMore,
      },
    };
  }

  async getSummary(userId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        transferDate: { gte: startOfMonth },
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((tx) => {
      if (tx.amount > 0) {
        totalIncome += tx.amount;
      } else {
        totalExpense += Math.abs(tx.amount);
      }
    });

    return {
      success: true,
      data: {
        totalIncome,
        totalExpense,
        netAmount: totalIncome - totalExpense,
      },
    };
  }

  async markAsRead(userId: string, id: string) {
    return this.prisma.transaction.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }
}
