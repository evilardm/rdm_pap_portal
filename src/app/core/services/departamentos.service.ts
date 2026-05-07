import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class DepartamentosService {
  private http = inject(HttpClient);

  departamentos = signal<string[]>([]);
  loading       = signal(false);

  load(): void {
    if (this.departamentos().length > 0) return;
    this.loading.set(true);
    this.http.get<string[] | { items: string[] } | { nombre: string }[]>('/api/departamentos').subscribe({
      next: raw => {
        let list: string[];
        if (Array.isArray(raw)) {
          list = raw.map((r: any) => (typeof r === 'string' ? r : r.nombre ?? r.id ?? String(r)));
        } else {
          const items = (raw as any).items ?? [];
          list = items.map((r: any) => (typeof r === 'string' ? r : r.nombre ?? r.id ?? String(r)));
        }
        this.departamentos.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
