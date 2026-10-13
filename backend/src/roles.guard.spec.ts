import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(['Admin']),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  function context(roles: string[]): ExecutionContext {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { sub: 'oidc-subject', roles } }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows a required server-asserted role', () => {
    expect(guard.canActivate(context(['Admin']))).toBe(true);
  });

  it('denies an authenticated user without the required role', () => {
    expect(() => guard.canActivate(context(['Contributor']))).toThrow(
      ForbiddenException,
    );
  });
});
