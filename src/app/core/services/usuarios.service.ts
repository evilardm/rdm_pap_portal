import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  ApiUsuario,
  ApiUsuarioCreatePayload,
  ApiUsuarioUpdatePayload,
} from '../models/api-usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);

  usuarios = signal<ApiUsuario[]>([]);
  loading  = signal(false);
  error    = signal('');

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.http.get<ApiUsuario[] | { items: ApiUsuario[] }>('/api/usuarios').subscribe({
      next: raw => {
        const list = Array.isArray(raw) ? raw : ((raw as any).items ?? []);
        this.usuarios.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.loading.set(false);
      },
    });
  }

  getById(id: string): Observable<ApiUsuario> {
    return this.http.get<ApiUsuario>(`/api/usuarios/${id}`);
  }

  create(payload: ApiUsuarioCreatePayload): Observable<ApiUsuario> {
    return this.http.post<ApiUsuario>('/api/usuarios', payload).pipe(
      tap(u => this.usuarios.update(list => [...list, u]))
    );
  }

  update(id: string, payload: ApiUsuarioUpdatePayload): Observable<ApiUsuario> {
    return this.http.put<ApiUsuario>(`/api/usuarios/${id}`, payload).pipe(
      tap(u => this.usuarios.update(list => list.map(x => x.id === id ? u : x)))
    );
  }

  changePassword(id: string, password: string): Observable<void> {
    return this.http.put<void>(`/api/usuarios/${id}/password`, { nuevaPassword: password });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/usuarios/${id}`).pipe(
      tap(() => this.usuarios.update(list => list.filter(x => x.id !== id)))
    );
  }
}
