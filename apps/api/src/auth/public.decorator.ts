import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Bypasses CognitoAuthGuard — use only for health checks / truly public routes. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
