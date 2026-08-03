import {
  Injectable,
  NestMiddleware,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';

import {
  allowTestUserHeader,
  isProductionRuntime,
} from '../config/runtime.config';

const PUBLIC_PATHS = new Set([
  '/',
  '/api',
  '/auth/login',
  '/api/auth/login',
  '/game-config',
  '/api/game-config',
  '/server-time',
  '/api/server-time',
  '/pet/config/species',
  '/api/pet/config/species',
  '/skill/config',
  '/api/skill/config',
  '/expedition/config',
  '/api/expedition/config',
]);

const DEVELOPMENT_ONLY_PATHS = [
  /(?:^|\/)dev(?:\/|$)/,
  /(?:^|\/)seed(?:[-/]|$)/,
  /(?:^|\/)backend(?:\/|$)/,
  /(?:^|\/)maintenance(?:\/|$)/,
  /(?:^|\/)mail\/(?:test-send|admin\/send)$/,
  /(?:^|\/)season\/settle$/,
  /(?:^|\/)trade\/expire$/,
  /(?:^|\/)pet\/all$/,
  /(?:^|\/)pet\/create$/,
  /(?:^|\/)pet\/level-up$/,
  /(?:^|\/)equipment\/dev(?:\/|$)/,
];

export function isDevelopmentOnlyPath(path: string) {
  const normalized = String(path || '').split('?')[0].replace(/\/+$/, '');
  return DEVELOPMENT_ONLY_PATHS.some((pattern) => pattern.test(normalized));
}

@Injectable()
export class RequestIdentityMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(request: Request, _response: Response, next: NextFunction) {
    const path = String(request.originalUrl || request.url || '').split('?')[0];
    const production = isProductionRuntime();

    if (production && isDevelopmentOnlyPath(path)) {
      throw new NotFoundException('Route is not available');
    }

    const authorization = String(request.headers.authorization || '');
    if (authorization) {
      const [type, token] = authorization.split(' ');
      if (type !== 'Bearer' || !token) {
        throw new UnauthorizedException('Invalid authorization format');
      }
      try {
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET || 'petverse_dev_secret',
        });
        const userId = Number(payload?.sub || 0);
        if (!Number.isInteger(userId) || userId <= 0) {
          throw new Error('Token does not contain a valid user id');
        }
        (request as any).user = payload;
        request.headers['x-user-id'] = String(userId);
        next();
        return;
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }

    if (PUBLIC_PATHS.has(path)) {
      next();
      return;
    }

    if (production && !allowTestUserHeader()) {
      throw new UnauthorizedException('Missing authorization header');
    }

    next();
  }
}
