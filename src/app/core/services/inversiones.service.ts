import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { Inversion, ApiInversion } from '../models/inversion.model';

@Injectable({ providedIn: 'root' })
export class InversionesService {
  private http = inject(HttpClient);

  private _inversiones = signal<Inversion[]>([]);
  loading = signal(false);
  error   = signal<string | null>(null);

  readonly inversiones = this._inversiones.asReadonly();

  load(force = false): void {
    if (!force && this._inversiones().length > 0) return;
    this.loading.set(true);
    this.error.set(null);

    this.http.get<any>('/api/inversiones').pipe(
      catchError(err => {
        this.error.set(`Error ${err.status}`);
        return of([]);
      }),
    ).subscribe(raw => {
      const items: any[] = Array.isArray(raw)
        ? raw
        : (raw.items ?? raw.data ?? raw.resultado ?? raw.inversiones ?? []);
      if (items.length) console.log('[InversionesService] sample item:', items[0]);
      this._inversiones.set(items.map((i: any) => ({
        id:          i.id          ?? i.Id          ?? '',
        codigo:      i.codigo      ?? i.Codigo      ?? i.code        ?? '',
        descripcion: i.descripcion ?? i.Descripcion ?? i.descrip     ?? i.nombre ?? i.description ?? '',
        cerrada:     i.cerrada     ?? i.Cerrada     ?? i.closed      ?? false,
      })));
      this.loading.set(false);
    });
  }
}
