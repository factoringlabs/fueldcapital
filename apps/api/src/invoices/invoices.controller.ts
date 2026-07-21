import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { UserRole } from '@fueled-capital/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { Roles } from '../auth/roles.decorator';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ExtractPreviewDto } from './dto/extract-preview.dto';
import { UnderwriteInvoiceDto } from './dto/underwrite-invoice.dto';
import { DisputeInvoiceDto, ResolveDisputeDto } from './dto/dispute-invoice.dto';
import { PlaceReserveHoldDto } from './dto/reserve-hold.dto';
import { ChargebackInvoiceDto } from './dto/chargeback.dto';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.invoices.findAllForUser(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoices.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.BROKER)
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.invoices.create(dto, user);
  }

  @Post('extract-preview')
  @Roles(UserRole.BROKER)
  extractPreview(@Body() dto: ExtractPreviewDto, @CurrentUser() user: AuthenticatedUser) {
    return this.invoices.previewExtraction(dto.s3Key, user);
  }

  @Post(':id/documents')
  @Roles(UserRole.BROKER)
  attachDocument(
    @Param('id') id: string,
    @Body() body: { docType: string; s3Key: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoices.attachDocument(id, body, user);
  }

  @Post(':id/extract')
  @Roles(UserRole.BROKER)
  runExtraction(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoices.runExtraction(id, user);
  }

  @Post(':id/submit-for-approval')
  @Roles(UserRole.BROKER)
  submitForApproval(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoices.submitForApproval(id, user);
  }

  @Post(':id/mc-approve')
  @Roles(UserRole.MACHINERY_COMPANY)
  mcApprove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoices.mcApprove(id, user);
  }

  @Post(':id/mc-dispute')
  @Roles(UserRole.MACHINERY_COMPANY)
  mcDispute(@Param('id') id: string, @Body() dto: DisputeInvoiceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.invoices.mcDispute(id, dto, user);
  }

  @Post(':id/resolve-dispute')
  @Roles(UserRole.ADMIN)
  resolveDispute(@Param('id') id: string, @Body() dto: ResolveDisputeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.invoices.resolveDispute(id, dto, user);
  }

  @Post(':id/underwrite')
  @Roles(UserRole.ADMIN)
  underwrite(@Param('id') id: string, @Body() dto: UnderwriteInvoiceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.invoices.underwrite(id, dto, user);
  }

  @Post(':id/respond-to-info-request')
  @Roles(UserRole.BROKER)
  respondToInfoRequest(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoices.respondToInfoRequest(id, user);
  }

  @Post(':id/fund')
  @Roles(UserRole.ADMIN)
  fund(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    // Default key is deterministic (not random) so that two concurrent retries of the
    // same funding request — with or without a client-supplied header — collide on the
    // same ledger idempotencyKey instead of double-funding.
    return this.invoices.fund(id, user, idempotencyKey ?? `fund:${id}`);
  }

  @Post(':id/settle')
  @Roles(UserRole.ADMIN)
  settle(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.invoices.settle(id, user, idempotencyKey ?? `settle:${id}`);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoices.cancel(id, user);
  }

  @Post(':id/reserve-hold')
  @Roles(UserRole.ADMIN)
  placeReserveHold(
    @Param('id') id: string,
    @Body() dto: PlaceReserveHoldDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoices.placeReserveHold(id, dto, user);
  }

  @Post(':id/reserve-release')
  @Roles(UserRole.ADMIN)
  releaseReserveHold(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoices.releaseReserveHold(id, user);
  }

  @Post(':id/chargeback')
  @Roles(UserRole.ADMIN)
  chargeback(
    @Param('id') id: string,
    @Body() dto: ChargebackInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.invoices.chargeback(id, dto, user, idempotencyKey ?? `chargeback:${id}`);
  }

  @Post(':id/write-off')
  @Roles(UserRole.ADMIN)
  writeOff(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.invoices.writeOff(id, user, idempotencyKey ?? `write-off:${id}`);
  }
}
