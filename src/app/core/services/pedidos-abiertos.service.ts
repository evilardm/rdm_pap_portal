import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import {
  PedidoAbierto, PedidoAbiertoStatus, DocumentoAdjunto,
  DocumentoCreatePayload, PrecioMensual,
} from '../models/pedido-abierto.model';
import { PaginatedResponse } from '../models/api.model';
import { API_BASE } from '../interceptors/api-key.interceptor';

interface ApiPedidoAbierto {
  id: string;
  numero: string;
  proveedor: string;
  descripcion: string;
  status: PedidoAbiertoStatus;
  importe: number;
  fechaInicio: string;
  fechaFin?: string;
  notas?: string;
  documentos?: ApiDocumento[];
  historialPrecios?: PrecioMensual[];
  createdAt: string;
  updatedAt: string;
}

interface ApiDocumento {
  id: string;
  nombre: string;
  descripcion?: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: string;
}

function mapDocumento(d: ApiDocumento): DocumentoAdjunto {
  return {
    id:          d.id,
    nombre:      d.nombre,
    descripcion: d.descripcion,
    fileName:    d.fileName,
    fileSize:    d.fileSize,
    fileUrl:     d.fileUrl,
    uploadedAt:  new Date(d.uploadedAt),
  };
}

function mapPedido(p: ApiPedidoAbierto): PedidoAbierto {
  return {
    id:               p.id,
    numero:           p.numero,
    proveedor:        p.proveedor,
    descripcion:      p.descripcion,
    status:           p.status,
    importe:          p.importe,
    fechaInicio:      new Date(p.fechaInicio),
    fechaFin:         p.fechaFin ? new Date(p.fechaFin) : undefined,
    notas:            p.notas,
    documentos:       (p.documentos ?? []).map(mapDocumento),
    historialPrecios: (p.historialPrecios ?? []).sort((a, b) => a.mes.localeCompare(b.mes)),
    createdAt:        new Date(p.createdAt),
    updatedAt:        new Date(p.updatedAt),
  };
}

@Injectable({ providedIn: 'root' })
export class PedidosAbiertosService {
  private http = inject(HttpClient);

  private _pedidos = signal<PedidoAbierto[]>([]);
  loading = signal(false);
  error   = signal<string | null>(null);

  readonly pedidos = this._pedidos.asReadonly();

  readonly stats = computed(() => {
    const all = this._pedidos();
    return {
      total:        all.length,
      abiertos:     all.filter(p => p.status === 'abierto').length,
      cerrados:     all.filter(p => p.status === 'cerrado').length,
      importeTotal: all.filter(p => p.status === 'abierto').reduce((s, p) => s + p.importe, 0),
    };
  });

  load(force = false): void {
    if (!force && this._pedidos().length > 0) return;
    this.loading.set(true);
    this.error.set(null);

    this.http.get<ApiPedidoAbierto[] | PaginatedResponse<ApiPedidoAbierto>>(`${API_BASE}/api/pedidos-abiertos`).pipe(
      catchError(err => {
        this.error.set(err.error?.mensaje ?? `Error ${err.status}`);
        return of([] as ApiPedidoAbierto[]);
      }),
    ).subscribe(raw => {
      const items: ApiPedidoAbierto[] = Array.isArray(raw) ? raw : raw.items;
      this._pedidos.set(items.map(mapPedido));
      this.loading.set(false);
    });
  }

  loadById(id: string): void {
    this.http.get<ApiPedidoAbierto>(`${API_BASE}/api/pedidos-abiertos/${id}`).pipe(
      catchError(() => of(null)),
    ).subscribe(p => {
      if (!p) return;
      const mapped = mapPedido(p);
      this._pedidos.update(list => {
        const idx = list.findIndex(x => x.id === id);
        return idx >= 0 ? list.map((x, i) => i === idx ? mapped : x) : [mapped, ...list];
      });
    });
  }

  getById(id: string): PedidoAbierto | undefined {
    return this._pedidos().find(p => p.id === id);
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  create(payload: Omit<PedidoAbierto, 'id' | 'documentos' | 'historialPrecios' | 'createdAt' | 'updatedAt'>): Observable<PedidoAbierto> {
    return this.http.post<ApiPedidoAbierto>(`${API_BASE}/api/pedidos-abiertos`, {
      ...payload,
      fechaInicio: payload.fechaInicio.toISOString().substring(0, 10),
      fechaFin:    payload.fechaFin?.toISOString().substring(0, 10),
    }).pipe(
      map(mapPedido),
      tap(p => this._pedidos.update(list => [p, ...list])),
    );
  }

  update(id: string, payload: Omit<PedidoAbierto, 'id' | 'documentos' | 'historialPrecios' | 'createdAt' | 'updatedAt'>): Observable<PedidoAbierto> {
    return this.http.put<ApiPedidoAbierto>(`${API_BASE}/api/pedidos-abiertos/${id}`, {
      ...payload,
      fechaInicio: payload.fechaInicio.toISOString().substring(0, 10),
      fechaFin:    payload.fechaFin?.toISOString().substring(0, 10),
    }).pipe(
      map(mapPedido),
      tap(p => this._pedidos.update(list => list.map(x => x.id === id ? p : x))),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/api/pedidos-abiertos/${id}`).pipe(
      tap(() => this._pedidos.update(list => list.filter(x => x.id !== id))),
    );
  }

  // ── Documentos ───────────────────────────────────────────────────────────────

  addDocumento(pedidoId: string, payload: DocumentoCreatePayload): Observable<DocumentoAdjunto> {
    return this.http.post<ApiDocumento>(`${API_BASE}/api/pedidos-abiertos/${pedidoId}/documentos`, payload).pipe(
      map(mapDocumento),
      tap(doc => this._pedidos.update(list =>
        list.map(p => p.id !== pedidoId ? p : {
          ...p, updatedAt: new Date(),
          documentos: [...p.documentos, doc],
        })
      )),
    );
  }

  removeDocumento(pedidoId: string, docId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/api/pedidos-abiertos/${pedidoId}/documentos/${docId}`).pipe(
      tap(() => this._pedidos.update(list =>
        list.map(p => p.id !== pedidoId ? p : {
          ...p, updatedAt: new Date(),
          documentos: p.documentos.filter(d => d.id !== docId),
        })
      )),
    );
  }

  // ── Historial de precios ─────────────────────────────────────────────────────

  addPrecio(pedidoId: string, payload: Omit<PrecioMensual, 'id'>): Observable<PrecioMensual> {
    return this.http.post<PrecioMensual>(`${API_BASE}/api/pedidos-abiertos/${pedidoId}/precios`, payload).pipe(
      tap(precio => this._pedidos.update(list =>
        list.map(p => p.id !== pedidoId ? p : {
          ...p, updatedAt: new Date(),
          historialPrecios: [...(p.historialPrecios ?? []), precio]
            .sort((a, b) => a.mes.localeCompare(b.mes)),
        })
      )),
    );
  }

  removePrecio(pedidoId: string, precioId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/api/pedidos-abiertos/${pedidoId}/precios/${precioId}`).pipe(
      tap(() => this._pedidos.update(list =>
        list.map(p => p.id !== pedidoId ? p : {
          ...p, updatedAt: new Date(),
          historialPrecios: (p.historialPrecios ?? []).filter(h => h.id !== precioId),
        })
      )),
    );
  }
}
