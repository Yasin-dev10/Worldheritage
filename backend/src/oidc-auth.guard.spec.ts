import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { OidcAuthGuard } from './oidc-auth.guard.js';

describe('OidcAuthGuard', () => {
  it('fails closed when the identity provider is not configured', async () => {
    const priorIssuer = process.env.AUTH_ISSUER_URL;
    const priorClient = process.env.AUTH_CLIENT_ID;
    delete process.env.AUTH_ISSUER_URL;
    delete process.env.AUTH_CLIENT_ID;
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as unknown as ExecutionContext;

    try {
      await expect(
        new OidcAuthGuard().canActivate(context),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    } finally {
      if (priorIssuer === undefined) delete process.env.AUTH_ISSUER_URL;
      else process.env.AUTH_ISSUER_URL = priorIssuer;
      if (priorClient === undefined) delete process.env.AUTH_CLIENT_ID;
      else process.env.AUTH_CLIENT_ID = priorClient;
    }
  });
});
