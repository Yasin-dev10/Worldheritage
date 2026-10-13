import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Request } from 'express';

export type AuthenticatedRequest = Request & {
  user: JWTPayload & { roles?: string[]; sub: string };
};

@Injectable()
export class OidcAuthGuard implements CanActivate {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;
  private jwksUri?: string;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const issuer = process.env.AUTH_ISSUER_URL;
    const audience = process.env.AUTH_AUDIENCE ?? process.env.AUTH_CLIENT_ID;
    if (!issuer || !audience || issuer.includes('.invalid')) {
      throw new UnauthorizedException(
        'Admin identity provider is not configured.',
      );
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token)
      throw new UnauthorizedException('A bearer access token is required.');

    try {
      const jwks = await this.getJwks(issuer);
      const { payload } = await jwtVerify(token, jwks, { issuer, audience });
      if (typeof payload.sub !== 'string' || !payload.sub) {
        throw new UnauthorizedException('The access token has no subject.');
      }
      const rawRoles = payload.roles;
      request.user = {
        ...payload,
        sub: payload.sub,
        roles: Array.isArray(rawRoles)
          ? rawRoles.filter((role): role is string => typeof role === 'string')
          : [],
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(
        'The access token is invalid or expired.',
      );
    }
  }

  private async getJwks(issuer: string) {
    const discovery = await fetch(
      `${issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`,
    );
    if (!discovery.ok)
      throw new UnauthorizedException('Identity provider discovery failed.');
    const metadata = (await discovery.json()) as {
      issuer?: string;
      jwks_uri?: string;
    };
    if (metadata.issuer !== issuer || !metadata.jwks_uri) {
      throw new UnauthorizedException('Identity provider metadata is invalid.');
    }
    if (!this.jwks || this.jwksUri !== metadata.jwks_uri) {
      this.jwksUri = metadata.jwks_uri;
      this.jwks = createRemoteJWKSet(new URL(metadata.jwks_uri));
    }
    return this.jwks;
  }
}
