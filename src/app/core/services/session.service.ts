import { Injectable, signal } from '@angular/core';
import { AuthSession } from '../models/auth-session.model';

const STORAGE_KEY = 'rdm_session';

/**
 * Manages JWT session storage without HttpClient dependency.
 * Used by the HTTP interceptor to avoid circular injection.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private _session = signal<AuthSession | null>(this.load());

  readonly session = this._session.asReadonly();

  set(s: AuthSession): void {
    this._session.set(s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  clear(): void {
    this._session.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  getToken(): string | null {
    return this._session()?.token ?? null;
  }

  isValid(): boolean {
    const s = this._session();
    if (!s) return false;
    return new Date(s.expira) > new Date();
  }

  private load(): AuthSession | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const s: AuthSession = JSON.parse(stored);
      if (new Date(s.expira) <= new Date()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return s;
    } catch {
      return null;
    }
  }
}
