import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

function moduleGuard(module: string, permission: 'read' | 'write' | 'approve' | 'any'): CanActivateFn {
  return () => {
    const auth   = inject(AuthService);
    const router = inject(Router);

    const ok = permission === 'write'   ? auth.canWrite(module)
             : permission === 'approve' ? auth.canApprove(module)
             : permission === 'read'    ? auth.canRead(module)
             : auth.hasModule(module);

    return ok ? true : router.createUrlTree(['/sin-permiso']);
  };
}

export const comprasReadGuard    = moduleGuard('compras', 'read');
export const comprasWriteGuard   = moduleGuard('compras', 'write');
export const comprasApproveGuard = moduleGuard('compras', 'approve');
export const maestrosReadGuard   = moduleGuard('maestros', 'read');
