import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, tap } from 'rxjs';
import { API_BASE } from '../interceptors/api-key.interceptor';
import {
  WfFlujo, WfNivel, WfCondicionFlujo, WfCondicionNivel,
  WfCampoDocumento, WfPendiente, WfInstancia, WfPaso, WfNivelResumen, WfEstadoNivel,
  ApiWfFlujo, ApiWfNivel, ApiWfCondicionFlujo, ApiWfCondicionNivel,
  ApiWfInstancia, ApiWfPaso, ApiWfPendiente, ApiWfNivelResumen,
} from '../models/workflow.model';

function mapCondicionFlujo(c: ApiWfCondicionFlujo): WfCondicionFlujo {
  return {
    id: c.id, flujoId: c.flujoId, orden: c.orden,
    campo: c.campo, operador: c.operador as WfCondicionFlujo['operador'],
    valor: c.valor, logica: c.logica as WfCondicionFlujo['logica'],
  };
}

function mapCondicionNivel(c: ApiWfCondicionNivel): WfCondicionNivel {
  return {
    id: c.id, nivelId: c.nivelId, orden: c.orden,
    campo: c.campo, operador: c.operador as WfCondicionNivel['operador'],
    valor: c.valor, logica: c.logica as WfCondicionNivel['logica'],
    accion: c.accion as WfCondicionNivel['accion'],
  };
}

function mapNivel(n: ApiWfNivel): WfNivel {
  return {
    id: n.id, flujoId: n.flujoId, orden: n.orden,
    nombre: n.nombre,
    tipoAprobador: n.tipoAprobador as WfNivel['tipoAprobador'],
    aprobadorValor: n.aprobadorValor,
    requiereTodos: n.requiereTodos,
    condiciones: (n.condiciones ?? []).map(mapCondicionNivel),
  };
}

function mapFlujo(f: ApiWfFlujo): WfFlujo {
  return {
    id: f.id, nombre: f.nombre, modulo: f.modulo, documento: f.documento,
    descripcion: f.descripcion, activo: f.activo,
    createdAt: f.createdAt ? new Date(f.createdAt) : undefined,
    updatedAt: f.updatedAt ? new Date(f.updatedAt) : undefined,
    condiciones: (f.condiciones ?? []).map(mapCondicionFlujo),
    niveles: (f.niveles ?? []).map(mapNivel),
  };
}

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private http = inject(HttpClient);

  readonly flujos          = signal<WfFlujo[]>([]);
  readonly loading         = signal(false);
  readonly error           = signal<string | null>(null);
  readonly camposDocumento = signal<WfCampoDocumento[]>([]);

  // ── Read ──────────────────────────────────────────────────────────────────

  loadFlujos(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<ApiWfFlujo[]>(`${API_BASE}/api/workflow`).subscribe({
      next: items => {
        this.flujos.set(items.map(mapFlujo));
        this.loading.set(false);
      },
      error: err => {
        const msg = err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`;
        this.error.set(msg);
        this.loading.set(false);
      },
    });
  }

  getFlujoById(id: string): Observable<WfFlujo> {
    return this.http.get<ApiWfFlujo>(`${API_BASE}/api/workflow/${id}/detalle`).pipe(
      map(mapFlujo),
    );
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  createFlujo(payload: WfFlujo): Observable<WfFlujo> {
    const basic = { nombre: payload.nombre, modulo: payload.modulo, documento: payload.documento, descripcion: payload.descripcion, activo: payload.activo };
    return this.http.post<ApiWfFlujo>(`${API_BASE}/api/workflow`, basic).pipe(
      switchMap(created => this.http.put<ApiWfFlujo>(
        `${API_BASE}/api/workflow/${created.id}/configuracion`,
        { condiciones: payload.condiciones, niveles: payload.niveles },
      )),
      map(mapFlujo),
      tap(f => this.flujos.update(list => [f, ...list])),
    );
  }

  updateFlujo(id: string, payload: WfFlujo): Observable<WfFlujo> {
    const basic = { nombre: payload.nombre, modulo: payload.modulo, documento: payload.documento, descripcion: payload.descripcion, activo: payload.activo };
    return this.http.put<ApiWfFlujo>(`${API_BASE}/api/workflow/${id}`, basic).pipe(
      switchMap(() => this.http.put<ApiWfFlujo>(
        `${API_BASE}/api/workflow/${id}/configuracion`,
        { condiciones: payload.condiciones, niveles: payload.niveles },
      )),
      map(mapFlujo),
      tap(f => this.flujos.update(list => list.map(x => x.id === id ? f : x))),
    );
  }

  duplicateFlujo(id: string): Observable<WfFlujo> {
    return this.getFlujoById(id).pipe(
      switchMap(src => this.createFlujo({
        nombre:      `Copia de ${src.nombre}`,
        modulo:      src.modulo,
        documento:   src.documento,
        descripcion: src.descripcion,
        activo:      false,
        condiciones: src.condiciones.map(c => ({
          orden: c.orden, campo: c.campo, operador: c.operador, valor: c.valor, logica: c.logica,
        })),
        niveles: src.niveles.map(n => ({
          orden: n.orden, nombre: n.nombre, tipoAprobador: n.tipoAprobador,
          aprobadorValor: n.aprobadorValor, requiereTodos: n.requiereTodos,
          condiciones: n.condiciones.map(nc => ({
            orden: nc.orden, campo: nc.campo, operador: nc.operador,
            valor: nc.valor, logica: nc.logica, accion: nc.accion,
          })),
        })),
      })),
    );
  }

  deleteFlujo(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/api/workflow/${id}`).pipe(
      tap(() => this.flujos.update(list => list.filter(x => x.id !== id))),
    );
  }

  // ── Instancias / bandeja ─────────────────────────────────────────────────

  getPendientes(): Observable<WfPendiente[]> {
    return this.http.get<ApiWfPendiente[]>(`${API_BASE}/api/workflow/instancias/pendientes`).pipe(
      map(items => items.map(p => ({
        instanciaId:        p.instanciaId,
        pasoId:             p.pasoId,
        flujoNombre:        p.flujoNombre ?? '',
        nivelNombre:        p.nivelNombre ?? '',
        modulo:             p.modulo,
        documentoId:        p.documentoId,
        solicitudNumero:    p.solicitudNumero ?? '',
        solicitudTitulo:    p.solicitudTitulo ?? '',
        solicitanteNombre:  p.solicitanteNombre ?? '',
        tipoDocumentoNombre: p.tipoDocumentoNombre ?? '',
        importeTotal:       p.importeTotal ?? 0,
        departamento:       p.departamento ?? '',
        createdAt:          p.createdAt ? new Date(p.createdAt) : undefined,
      }))),
    );
  }

  getInstanciasSolicitud(tipoDocumentoId: string, solicitudId: string): Observable<WfInstancia> {
    return this.http.get<ApiWfInstancia>(
      `${API_BASE}/api/workflow/instancias/documento/${tipoDocumentoId}/${solicitudId}`
    ).pipe(map(i => this.mapInstancia(i)));
  }

  aprobar(instanciaId: string, comentario?: string): Observable<void> {
    return this.http.post<void>(
      `${API_BASE}/api/workflow/instancias/${instanciaId}/aprobar`,
      { comentario: comentario ?? '' },
    );
  }

  rechazar(instanciaId: string, comentario: string): Observable<void> {
    return this.http.post<void>(
      `${API_BASE}/api/workflow/instancias/${instanciaId}/rechazar`,
      { comentario },
    );
  }

  private mapPaso(p: ApiWfPaso): WfPaso {
    return {
      id:             p.id,
      instanciaId:    p.instanciaId,
      nivelId:        p.nivelId,
      nivelNombre:    p.nivelNombre,
      estado:         p.estado as WfPaso['estado'],
      aprobadorId:    p.aprobadorId,
      aprobadorNombre: p.aprobadorNombre,
      comentario:     p.comentario,
      fechaAccion:    p.fechaAccion ? new Date(p.fechaAccion) : undefined,
      createdAt:      p.createdAt  ? new Date(p.createdAt)   : undefined,
    };
  }

  private mapNivelResumen(n: ApiWfNivelResumen): WfNivelResumen {
    return {
      nivelId:        n.nivelId,
      nivelNombre:    n.nivelNombre,
      nivelOrden:     n.nivelOrden,
      tipoAprobador:  n.tipoAprobador,
      aprobadorValor: n.aprobadorValor,
      estado:         n.estado as WfEstadoNivel,
      aprobadorNombre: n.aprobadorNombre ?? undefined,
      fechaAccion:    n.fechaAccion ? new Date(n.fechaAccion) : undefined,
      comentario:     n.comentario ?? undefined,
    };
  }

  private mapInstancia(i: ApiWfInstancia): WfInstancia {
    return {
      id:               i.id,
      flujoId:          i.flujoId,
      flujoNombre:      i.flujoNombre,
      modulo:           i.modulo,
      documentoTipo:    i.documentoTipo,
      documentoId:      i.documentoId,
      estado:           i.estado as WfInstancia['estado'],
      nivelActual:      i.nivelActual,
      datosDocumento:   {},
      solicitanteId:    i.solicitanteId ?? '',
      createdAt:        i.createdAt  ? new Date(i.createdAt)  : undefined,
      updatedAt:        i.updatedAt  ? new Date(i.updatedAt)  : undefined,
      pasos:            (i.pasos ?? []).map(p => this.mapPaso(p)),
      niveles:          (i.niveles ?? []).map(n => this.mapNivelResumen(n)),
    };
  }

  // ── Campos documento ─────────────────────────────────────────────────────

  loadCampos(modulo: string, documento: string): void {
    this.camposDocumento.set([]);
    this.http.get<WfCampoDocumento[]>(`${API_BASE}/api/workflow/campos`, {
      params: { modulo, documento },
    }).subscribe({
      next:  items => this.camposDocumento.set(items),
      error: ()    => this.camposDocumento.set([]),
    });
  }

  // ── Instance operations ───────────────────────────────────────────────────

  iniciarWorkflow(documentoId: string, documentoTipo: string, modulo: string, datosDocumento: Record<string, unknown>): Observable<{ instanciaId: string }> {
    return this.http.post<{ instanciaId: string }>(`${API_BASE}/api/workflow/iniciar`, {
      documentoId, documentoTipo, modulo, datosDocumento,
    });
  }
}
