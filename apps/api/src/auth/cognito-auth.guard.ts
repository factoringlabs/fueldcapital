import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Verifies the Cognito-issued access token on every request, then loads the
 * matching AppUser row so role + ownership (brokerId/machineryCompanyId) come
 * from our own database rather than trusting Cognito group claims alone.
 *
 * Local dev bypass: when COGNITO_USER_POOL_ID is unset (no real pool wired up
 * yet — that's Phase 4 Terraform work), a request may instead send
 * `x-dev-user-id: <AppUser.id>` and skip JWT verification entirely. This path
 * never activates once a real pool id is configured, which every deployed
 * environment (dev/staging/prod) will have.
 */
@Injectable()
export class CognitoAuthGuard implements CanActivate {
  private readonly verifier?: ReturnType<typeof CognitoJwtVerifier.create>;
  private readonly devModeEnabled: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {
    const userPoolId = this.config.get<string>('COGNITO_USER_POOL_ID');
    this.devModeEnabled = !userPoolId;
    if (userPoolId) {
      this.verifier = CognitoJwtVerifier.create({
        userPoolId,
        tokenUse: 'access',
        clientId: this.config.get<string>('COGNITO_CLIENT_ID') ?? '',
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    let appUser: Awaited<ReturnType<PrismaService['appUser']['findUnique']>>;

    if (this.devModeEnabled) {
      const devUserId: string | undefined = request.headers['x-dev-user-id'];
      if (!devUserId) {
        throw new UnauthorizedException(
          'COGNITO_USER_POOL_ID is not configured — send x-dev-user-id for local development',
        );
      }
      appUser = await this.prisma.appUser.findUnique({ where: { id: devUserId } });
    } else {
      const authHeader: string | undefined = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedException('Missing bearer token');
      }
      const token = authHeader.slice('Bearer '.length);
      let sub: string;
      try {
        const payload = await this.verifier!.verify(token);
        sub = payload.sub;
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
      appUser = await this.prisma.appUser.findUnique({ where: { cognitoSub: sub } });
    }

    if (!appUser || appUser.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not recognized or inactive');
    }

    request.user = {
      id: appUser.id,
      cognitoSub: appUser.cognitoSub,
      email: appUser.email,
      role: appUser.role,
      brokerId: appUser.brokerId,
      machineryCompanyId: appUser.machineryCompanyId,
    };
    return true;
  }
}
