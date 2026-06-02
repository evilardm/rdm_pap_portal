import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PaginatedResponse } from '../models/api.model';
import { FormaPago } from '../models/forma-pago.model';
import { API_BASE } from '../interceptors/api-key.interceptor';

@Injectable({ providedIn: 'root' })
export class FormasPagoService {
  private http = inject(HttpClient);

  readonly formasPago = signal<FormaPago[]>([]);
  readonly loading    = signal(false);
  readonly error      = signal<string | null>(null);

  load(force = false): void {
    if (!force && this.formasPago().length > 0) return;
    this.loading.set(true);
    this.http.get<FormaPago[] | PaginatedResponse<FormaPago>>(`${API_BASE}/api/formas-pago`).subscribe({
      next: raw => {
        const items = Array.isArray(raw) ? raw : raw.items;
        this.formasPago.set(items);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.error?.mensaje ?? `Error ${err.status}`);
        this.loading.set(false);
      },
    });
  }
}
