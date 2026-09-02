import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { AuthService } from './auth.service';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { PaginatedResponse } from '../models/api.model';
import {
  ApiSolicitud, ApiSolicitudCreatePayload, ApiSolicitudUpdatePayload, ApiDecidirPayload,
  ApiPresupuesto, ApiPresupuestoCreatePayload, ApiCompradorPatchPayload,
} from '../models/api-solicitud.model';
import {
  PurchaseRequest, RequestItem, RequestStatus, RequestPriority,
  Presupuesto, PresupuestoCreatePayload, PurchaseRequestFilter,
} from '../models/purchase-request.model';
import { API_BASE } from '../interceptors/api-key.interceptor';

const PAGE_SIZE = 100;

const ESTADO_MAP: Record<string, RequestStatus> = {
  borrador:  'draft',
  pendiente: 'pending',
  aprobada:  'approved',
  rechazada: 'rejected',
};

const PRIORIDAD_MAP: Record<string, RequestPriority> = {
  baja:    'low',
  media:   'medium',
  alta:    'high',
  urgente: 'urgent',
};

const PRIORIDAD_TO_API: Record<string, string> = {
  low: 'baja', medium: 'media', high: 'alta', urgent: 'urgente',
};

function mapSolicitud(s: ApiSolicitud): PurchaseRequest {
  return {
    id:                    s.id,
    requestNumber:         s.numeroSolicitud,
    title:                 s.titulo,
    description:           s.descripcion,
    status:                ESTADO_MAP[s.estado] ?? 'draft',
    priority:              PRIORIDAD_MAP[s.prioridad] ?? 'medium',
    supplier:              s.proveedorNombre,
    proveedorId:           s.proveedorId,
    referencia:            s.referencia,
    ordenMantenimiento:    s.ordenMantenimiento,
    expectedDeliveryDate:  s.fechaEntregaPrevista ? new Date(s.fechaEntregaPrevista) : undefined,
    totalAmount:           s.importeTotal,
    items: (s.lineas ?? []).map((l, i): RequestItem => ({
      id:             l.id ?? String(i),
      description:    l.descripcion,
      quantity:       l.cantidad ?? 0,
      unitPrice:      l.precioUnitario ?? 0,
      unit:           l.unidad,
      subtotal:       l.subtotal ?? (l.cantidad ?? 0) * (l.precioUnitario ?? 0),
      articuloId:     l.articuloId,
      articuloNombre: l.articuloNombre,
      articuloRefId:  l.articuloRefId,
      orden:          l.orden,
    })),
    tipoDocumentoId:       s.tipoDocumentoId,
    tipoDocumentoNombre:   s.tipoDocumentoNombre,
    gimId:                 s.oferta_gim ?? s.ofertaGim ?? s.gimId,
    inversion:             s.inversion,
    codigoInversion:       s.codigoInversion,
    compradorId:           s.compradorId,
    compradorNombre:       s.compradorNombre ?? (s as any).comprador_nombre ?? (s as any).nombreComprador,
    formaPagoId:           s.formaPagoId,
    formaPagoNombre:       s.formaPagoNombre,
    numeroPedido:          s.numeroPedido,
    requesterId:           s.solicitanteId ?? '',
    requesterName:         s.solicitanteNombre ?? '',
    requesterDepartment:   s.solicitanteDepartamento ?? '',
    aprobadorId:           s.aprobadorId,
    aprobadorNombre:       s.aprobadorNombre,
    pasoId:                s.pasoId,
    comments:              s.comentarios,
    rejectionReason:       s.motivoRechazo,
    createdAt:             s.createdAt ? new Date(s.createdAt) : (s.creadoAt ? new Date(s.creadoAt) : new Date()),
    updatedAt:             s.updatedAt ? new Date(s.updatedAt) : (s.actualizadoAt ? new Date(s.actualizadoAt) : new Date()),
    approvedAt:            s.aprobadoAt  ? new Date(s.aprobadoAt)  : undefined,
    rejectedAt:            s.rechazadoAt ? new Date(s.rechazadoAt) : undefined,
    presupuestos: (s.presupuestos ?? []).map((p: ApiPresupuesto): Presupuesto => ({
      id:           p.id,
      proveedor:    p.proveedor,
      precio:       p.precio,
      fecha:        p.fecha,
      numeroOferta: p.numeroOferta,
      fileName:     p.fileName,
      fileSize:     p.fileSize,
      fileUrl:      p.fileUrl,
      comentarios:  p.comentarios,
      seleccionado: p.seleccionado,
    })),
  };
}

@Injectable({ providedIn: 'root' })
export class PurchaseRequestService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private _requests = signal<PurchaseRequest[]>([]);

  readonly requests        = this._requests.asReadonly();
  readonly loadingSolicitudes = signal(false);
  readonly errorSolicitudes   = signal<string | null>(null);

  readonly stats = computed(() => {
    const all = this._requests();
    return {
      total:       all.length,
      pending:     all.filter(r => r.status === 'pending').length,
      approved:    all.filter(r => r.status === 'approved').length,
      rejected:    all.filter(r => r.status === 'rejected').length,
      draft:       all.filter(r => r.status === 'draft').length,
      totalAmount: all.reduce((s, r) => s + r.totalAmount, 0),
    };
  });

  // ── Carga ────────────────────────────────────────────────────────────────────

  loadSolicitudes(): void {
    this.loadingSolicitudes.set(true);
    this.errorSolicitudes.set(null);

    const endpoint = this.auth.canViewAllSolicitudes() ? '/api/solicitudes/todas' : '/api/solicitudes';
    this.loadAllPages<ApiSolicitud>(endpoint).pipe(
      catchError(err => {
        const detail = err.error ? JSON.stringify(err.error) : err.message;
        this.errorSolicitudes.set(`Error ${err.status}: ${detail}`);
        return of<ApiSolicitud[]>([]);
      }),
    ).subscribe(items => {
      const freshList = items.map(mapSolicitud);
      // Preserve fields that the list endpoint omits but loadById already populated
      this._requests.update(existing => {
        if (!existing.length) return freshList;
        const existingMap = new Map(existing.map(r => [r.id, r]));
        return freshList.map(r => {
          const prev = existingMap.get(r.id);
          if (!prev) return r;
          return {
            ...r,
            referencia:          r.referencia          ?? prev.referencia,
            tipoDocumentoId:     r.tipoDocumentoId     ?? prev.tipoDocumentoId,
            tipoDocumentoNombre: r.tipoDocumentoNombre ?? prev.tipoDocumentoNombre,
            ordenMantenimiento:  r.ordenMantenimiento  ?? prev.ordenMantenimiento,
            aprobadorId:         r.aprobadorId         ?? prev.aprobadorId,
            aprobadorNombre:     r.aprobadorNombre      ?? prev.aprobadorNombre,
            gimId:               r.gimId               ?? prev.gimId,
            requestNumber:       r.requestNumber       || prev.requestNumber,
            title:               r.title               || prev.title,
            inversion:           r.inversion           ?? prev.inversion,
            codigoInversion:     r.codigoInversion     ?? prev.codigoInversion,
            items:               r.items.length        ?  r.items : prev.items,
          };
        });
      });
      this.loadingSolicitudes.set(false);
    });
  }

  /** Carga una solicitud individual y actualiza el registro en el listado */
  loadById(id: string): void {
    this.http.get<ApiSolicitud>(`${API_BASE}/api/solicitudes/${id}`).pipe(
      catchError(() => of(null)),
    ).subscribe(s => {
      if (!s) return;
      const mapped = mapSolicitud(s);
      this._requests.update(list => {
        const idx = list.findIndex(r => r.id === id);
        if (idx < 0) return [mapped, ...list];
        const prev = list[idx];
        const merged = s.presupuestos != null ? mapped : { ...mapped, presupuestos: prev.presupuestos };
        return list.map((r, i) => i === idx ? merged : r);
      });
    });
  }

  // ── Escritura ────────────────────────────────────────────────────────────────

  update(id: string, payload: ApiSolicitudUpdatePayload): Observable<PurchaseRequest> {
    return this.http.put<ApiSolicitud>(`${API_BASE}/api/solicitudes/${id}`, payload).pipe(
      tap(s => {
        const mapped = mapSolicitud(s);
        this._requests.update(list => list.map(r => {
          if (r.id !== id) return r;
          return s.presupuestos != null ? mapped : { ...mapped, presupuestos: r.presupuestos };
        }));
      }),
      map(mapSolicitud),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/api/solicitudes/${id}`).pipe(
      tap(() => this._requests.update(list => list.filter(r => r.id !== id))),
    );
  }

  create(payload: ApiSolicitudCreatePayload): Observable<PurchaseRequest> {
    return this.http.post<ApiSolicitud>(`${API_BASE}/api/solicitudes`, payload).pipe(
      tap(s => {
        const mapped = mapSolicitud(s);
        this._requests.update(list => [mapped, ...list]);
      }),
      map(mapSolicitud),
    );
  }

  enviar(id: string): Observable<PurchaseRequest | null> {
    return this.http.post<ApiSolicitud | null>(`${API_BASE}/api/solicitudes/${id}/enviar`, {}).pipe(
      tap(s => {
        if (s) {
          const mapped = mapSolicitud(s);
          this._requests.update(list => list.map(r => r.id === id ? mapped : r));
        } else {
          // 204 No Content — marcar localmente como pendiente hasta que loadById refresque
          this._requests.update(list =>
            list.map(r => r.id === id ? { ...r, status: 'pending' as const, updatedAt: new Date() } : r)
          );
        }
      }),
      map(s => s ? mapSolicitud(s) : null),
    );
  }

  decidir(pasoId: string, decision: 'aprobada' | 'rechazada', comentario?: string): Observable<void> {
    const body: ApiDecidirPayload = { decision, ...(comentario ? { comentario } : {}) };
    return this.http.post<void>(`${API_BASE}/api/aprobaciones/${pasoId}/decidir`, body).pipe(
      tap(() => {
        const status: RequestStatus = decision === 'aprobada' ? 'approved' : 'rejected';
        this._requests.update(list =>
          list.map(r => r.pasoId === pasoId
            ? { ...r, status, comments: comentario, updatedAt: new Date() }
            : r
          )
        );
      }),
    );
  }

  exportarSage(id: string): Observable<{ solicitudId: string; numeroSolicitud: string; numeroPedido: number }> {
    return this.http.post<{ solicitudId: string; numeroSolicitud: string; numeroPedido: number }>(
      `${API_BASE}/api/solicitudes/${id}/exportar-sage`, {}
    ).pipe(
      tap(res => this._requests.update(list =>
        list.map(r => r.id === id ? { ...r, numeroPedido: res.numeroPedido } : r)
      )),
    );
  }

  patchComprador(id: string, payload: ApiCompradorPatchPayload): Observable<PurchaseRequest> {
    return this.http.patch<ApiSolicitud>(`${API_BASE}/api/solicitudes/${id}/comprador`, payload).pipe(
      tap(s => {
        const mapped = mapSolicitud(s);
        this._requests.update(list => list.map(r => {
          if (r.id !== id) return r;
          return s.presupuestos != null ? mapped : { ...mapped, presupuestos: r.presupuestos };
        }));
      }),
      map(mapSolicitud),
    );
  }

  loadPresupuestos(solicitudId: string): void {
    this.http.get<ApiPresupuesto[]>(`${API_BASE}/api/solicitudes/${solicitudId}/presupuestos`).pipe(
      catchError(() => of([] as ApiPresupuesto[])),
    ).subscribe(items => {
      const mapped = items.map((p): Presupuesto => ({
        id: p.id, proveedor: p.proveedor, precio: p.precio, fecha: p.fecha,
        numeroOferta: p.numeroOferta, fileName: p.fileName, fileSize: p.fileSize,
        fileUrl: p.fileUrl, comentarios: p.comentarios, seleccionado: p.seleccionado,
      }));
      this._requests.update(list =>
        list.map(r => r.id === solicitudId ? { ...r, presupuestos: mapped } : r)
      );
    });
  }

  seleccionarPresupuesto(solicitudId: string, presupuestoId: string): Observable<Presupuesto> {
    return this.http.patch<ApiPresupuesto>(
      `${API_BASE}/api/solicitudes/${solicitudId}/presupuestos/${presupuestoId}/seleccionar`, {}
    ).pipe(
      map((p): Presupuesto => ({
        id: p.id, proveedor: p.proveedor, precio: p.precio, fecha: p.fecha,
        numeroOferta: p.numeroOferta, fileName: p.fileName, fileSize: p.fileSize,
        fileUrl: p.fileUrl, comentarios: p.comentarios, seleccionado: p.seleccionado,
      })),
      tap(() => {
        this._requests.update(list => list.map(r => {
          if (r.id !== solicitudId) return r;
          return {
            ...r,
            presupuestos: (r.presupuestos ?? []).map(p => ({
              ...p, seleccionado: p.id === presupuestoId,
            })),
          };
        }));
      }),
    );
  }

  deseleccionarPresupuesto(solicitudId: string, presupuestoId: string): Observable<void> {
    return this.http.patch<void>(
      `${API_BASE}/api/solicitudes/${solicitudId}/presupuestos/${presupuestoId}/deseleccionar`, {}
    ).pipe(
      tap(() => {
        this._requests.update(list => list.map(r => {
          if (r.id !== solicitudId) return r;
          return {
            ...r,
            presupuestos: (r.presupuestos ?? []).map(p => ({
              ...p, seleccionado: p.id === presupuestoId ? false : p.seleccionado,
            })),
          };
        }));
      }),
    );
  }

  deletePresupuesto(solicitudId: string, presupuestoId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/api/solicitudes/${solicitudId}/presupuestos/${presupuestoId}`).pipe(
      tap(() => this._requests.update(list =>
        list.map(r => r.id === solicitudId ? {
          ...r, presupuestos: (r.presupuestos ?? []).filter(p => p.id !== presupuestoId),
        } : r)
      )),
    );
  }

  createPresupuesto(solicitudId: string, payload: ApiPresupuestoCreatePayload): Observable<Presupuesto> {
    return this.http.post<ApiPresupuesto>(`${API_BASE}/api/solicitudes/${solicitudId}/presupuestos`, payload).pipe(
      map((p): Presupuesto => ({
        id:           p.id,
        proveedor:    p.proveedor,
        precio:       p.precio,
        fecha:        p.fecha,
        numeroOferta: p.numeroOferta,
        fileName:     p.fileName,
        fileSize:     p.fileSize,
        fileUrl:      p.fileUrl,
        comentarios:  p.comentarios,
      })),
      tap(presupuesto => {
        this._requests.update(list =>
          list.map(r => r.id !== solicitudId ? r : {
            ...r,
            updatedAt:    new Date(),
            presupuestos: [...(r.presupuestos ?? []), presupuesto],
          })
        );
      }),
    );
  }

  // ── Filtrado ─────────────────────────────────────────────────────────────────

  getFiltered(filter: PurchaseRequestFilter): PurchaseRequest[] {
    return this._requests().filter(r => {
      if (filter.status && filter.status !== 'all' && r.status !== filter.status) return false;
      if (filter.priority && filter.priority !== 'all' && r.priority !== filter.priority) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        if (
          !r.title.toLowerCase().includes(q) &&
          !r.requestNumber.toLowerCase().includes(q) &&
          !r.requesterName.toLowerCase().includes(q) &&
          !(r.referencia ?? '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }

  getSolicitudesAprobador(aprobadorId: string): Observable<PurchaseRequest[]> {
    return this.loadAllPages<ApiSolicitud>(
      `/api/solicitudes/aprobador/${encodeURIComponent(aprobadorId)}`
    ).pipe(map(items => items.map(mapSolicitud)));
  }

  // ── Helper de paginación ─────────────────────────────────────────────────────

  private loadAllPages<T>(path: string): Observable<T[]> {
    const url = `${API_BASE}${path}`;
    const params = { pagina: '1', tamano: String(PAGE_SIZE) };

    return this.http.get<PaginatedResponse<T>>(url, { params }).pipe(
      switchMap(first => {
        if (first.totalPaginas <= 1) return of(first.items);
        const rest$ = Array.from({ length: first.totalPaginas - 1 }, (_, i) =>
          this.http.get<PaginatedResponse<T>>(url, {
            params: { pagina: String(i + 2), tamano: String(PAGE_SIZE) },
          }).pipe(map(r => r.items))
        );
        return forkJoin(rest$).pipe(map(pages => [...first.items, ...pages.flat()]));
      }),
    );
  }
}

export { PRIORIDAD_TO_API };
