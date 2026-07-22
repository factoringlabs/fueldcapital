import { Controller, Get, Query } from '@nestjs/common';
import { LedgerEntryType, UserRole } from '@fueled-capital/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { LedgerService } from './ledger.service';

/**
 * One endpoint, scoped by the caller's own role — mirrors InvoicesController's
 * GET /invoices pattern. Admin sees everything (optionally filtered by
 * broker/machinery company); Broker and Machinery Company are always scoped
 * to their own party regardless of what query params they send, so this
 * doubles as each portal's "statement of account" screen.
 */
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get()
  find(
    @CurrentUser() user: AuthenticatedUser,
    @Query('brokerId') brokerId?: string,
    @Query('machineryCompanyId') machineryCompanyId?: string,
    @Query('invoiceId') invoiceId?: string,
    @Query('entryType') entryType?: LedgerEntryType,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const filters = {
      invoiceId: invoiceId || undefined,
      entryType: entryType || undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };

    if (user.role === UserRole.BROKER) {
      return this.ledger.find({ ...filters, brokerId: user.brokerId! });
    }
    if (user.role === UserRole.MACHINERY_COMPANY) {
      return this.ledger.find({ ...filters, machineryCompanyId: user.machineryCompanyId! });
    }
    return this.ledger.find({ ...filters, brokerId: brokerId || undefined, machineryCompanyId: machineryCompanyId || undefined });
  }
}
