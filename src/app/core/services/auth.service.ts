import { Injectable, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { SessionService } from './session.service';
import { AuthSession } from '../models/auth-session.model';
import { User } from '../models/user.model';

/** Maps app module keys to API module names */
const MODULE_MAP: Record<string, string> = {
  compras:    'COMPRAS',
  maestros:   'MASTER_DATA',
  ventas:     'VENTAS',
  produccion: 'PRODUCCION',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http    = inject(HttpClient);
  private session = inject(SessionService);
  private router  = inject(Router);

  readonly isAuthenticated = computed(() => this.session.isValid());
  readonly isAdmin         = computed(() => this.session.session()?.esAdmin ?? false);

  /** True for total admins and COMPRAS module admins — uses /api/solicitudes/todas */
  readonly canViewAllSolicitudes = computed(() => {
    const s = this.session.session();
    if (!s) return false;
    if (s.esAdmin) return true;
    return s.modulos.some(m => m.modulo === 'COMPRAS' && m.esAdminModulo);
  });

  readonly isApprover      = computed(() => {
    const s = this.session.session();
    if (!s) return false;
    if (s.esAdmin) return true;
    return s.modulos.some(m => m.puedeAprobar);
  });

  readonly currentUser = computed((): User | null => {
    const s = this.session.session();
    if (!s) return null;
    const role = s.esAdmin
      ? 'admin'
      : s.modulos.some(m => m.puedeAprobar) ? 'approver' : 'requester';
    return { id: s.email, email: s.email, name: s.nombre, role, department: '' };
  });

  /** Requires a /api/users endpoint — returns empty until implemented */
  readonly allUsers = computed((): User[] => []);

  login(email: string, password: string): Observable<{ success: boolean; error?: string }> {
    return this.http.post<AuthSession>('/api/auth/login', { email, password }).pipe(
      map(s => {
        this.session.set(s);
        return { success: true };
      }),
      catchError(err => {
        const msg = err.error?.mensaje ?? err.error?.message ?? 'Credenciales incorrectas';
        return of({ success: false, error: msg as string });
      })
    );
  }

  logout(): void {
    this.session.clear();
    this.router.navigate(['/login']);
  }

  /** True if user has any access (read/write/approve) to the module */
  hasModule(module: string): boolean {
    const s = this.session.session();
    if (!s) return false;
    if (s.esAdmin) return true;
    const key = MODULE_MAP[module] ?? module.toUpperCase();
    return s.modulos.some(m => m.modulo === key &&
      (m.puedeLeer || m.puedeEscribir || m.puedeAprobar || m.esAdminModulo));
  }

  canRead(module: string): boolean {
    const s = this.session.session();
    if (!s) return false;
    if (s.esAdmin) return true;
    const key = MODULE_MAP[module] ?? module.toUpperCase();
    return s.modulos.some(m => m.modulo === key && m.puedeLeer);
  }

  canWrite(module: string): boolean {
    const s = this.session.session();
    if (!s) return false;
    if (s.esAdmin) return true;
    const key = MODULE_MAP[module] ?? module.toUpperCase();
    return s.modulos.some(m => m.modulo === key && m.puedeEscribir);
  }

  canApprove(module: string): boolean {
    const s = this.session.session();
    if (!s) return false;
    if (s.esAdmin) return true;
    const key = MODULE_MAP[module] ?? module.toUpperCase();
    return s.modulos.some(m => m.modulo === key && m.puedeAprobar);
  }

  canDelete(module: string): boolean {
    const s = this.session.session();
    if (!s) return false;
    if (s.esAdmin) return true;
    const key = MODULE_MAP[module] ?? module.toUpperCase();
    return s.modulos.some(m => m.modulo === key && m.esAdminModulo);
  }

  /** Legacy compatibility with old permission string format */
  hasPermission(action: string): boolean {
    const [module, perm] = action.split('.');
    if (!perm) return this.hasModule(module);
    if (perm === 'aprobar_solicitud') return this.canApprove(module);
    if (perm.startsWith('crear') || perm.startsWith('gestionar')) return this.canWrite(module);
    return this.canRead(module);
  }
}
