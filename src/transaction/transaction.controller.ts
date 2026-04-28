import { Controller, Get, Patch, Query, Param, UseGuards, Request, UsePipes, ValidationPipe } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { GetTransactionsDto } from './dto/get-transactions.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async getTransactions(@Request() req: any, @Query() query: GetTransactionsDto) {
    return this.transactionService.getTransactions(req.user.id, query);
  }

  @Get('summary')
  async getSummary(@Request() req: any) {
    return this.transactionService.getSummary(req.user.id);
  }

  @Patch(':id/read')
  async markAsRead(@Request() req: any, @Param('id') id: string) {
    return this.transactionService.markAsRead(req.user.id, id);
  }
}
