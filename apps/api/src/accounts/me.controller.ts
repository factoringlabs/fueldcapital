import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

/** Lets the frontend resolve the signed-in user's own brokerId/machineryCompanyId. */
@Controller('me')
export class MeController {
  @Get()
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
