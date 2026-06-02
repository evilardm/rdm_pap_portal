import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { TipoDocumento } from '../models/tipo-compra.model';
import { PaginatedResponse } from '../models/api.model';
import { API_BASE } from '../interceptors/api-key.interceptor';

@Injectable({ providedIn: 'root' })
export class TiposDocumentoService {
  private http = inject(HttpClient);

  readonly tiposDocumento = signal<TipoDocumento[]>([]);
  readonly loading        = signal(false);
  readonly error          = signal<string | null>(null);

  load(force = false): void {
    if (!force && this.tiposDocumento().length > 0) return;
    this.loading.set(true);
    this.http.get<TipoDocumento[] | PaginatedResponse<TipoDocumento>>(`${API_BASE}/api/tipos-documento`).subscribe({
      next: raw => {
        const items = Array.isArray(raw) ? raw : raw.items;
        this.tiposDocumento.set(items);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.error?.mensaje ?? `Error ${err.status}`);
        this.loading.set(false);
      },
    });
  }

  getById(id: string): Observable<TipoDocumento> {
    return this.http.get<TipoDocumento>(`${API_BASE}/api/tipos-documento/${id}`);
  }

  loadOne(id: string): void {
    if (this.tiposDocumento().some(t => t.id === id)) return;
    this.http.get<TipoDocumento>(`${API_BASE}/api/tipos-documento/${id}`).subscribe({
      next: t => this.tiposDocumento.update(list => [...list, t]),
      error: () => {},
    });
  }

  create(payload: Omit<TipoDocumento, 'id'>): Observable<TipoDocumento> {
    return this.http.post<TipoDocumento>(`${API_BASE}/api/tipos-documento`, payload).pipe(
      tap(t => this.tiposDocumento.update(list => [...list, t])),
    );
  }

  update(id: string, payload: Partial<Omit<TipoDocumento, 'id'>>): Observable<TipoDocumento> {
    return this.http.put<TipoDocumento>(`${API_BASE}/api/tipos-documento/${id}`, payload).pipe(
      tap(t => this.tiposDocumento.update(list => list.map(x => x.id === id ? t : x))),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/api/tipos-documento/${id}`).pipe(
      tap(() => this.tiposDocumento.update(list => list.filter(x => x.id !== id))),
    );
  }
}
