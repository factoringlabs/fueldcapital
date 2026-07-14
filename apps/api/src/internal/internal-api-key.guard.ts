import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guards the /internal/* routes that Lambda handlers call (fee runs, reserve
 * checks, notification sending, async extraction). These are system-to-
 * system calls with no portal user attached, so they're authenticated by a
 * shared secret rather than a Cognito token.
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedKey = this.config.get<string>('INTERNAL_API_KEY');
    if (!expectedKey) {
      throw new UnauthorizedException('INTERNAL_API_KEY is not configured — internal routes are disabled');
    }
    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers['x-internal-api-key'];
    if (providedKey !== expectedKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }
    return true;
  }
}
