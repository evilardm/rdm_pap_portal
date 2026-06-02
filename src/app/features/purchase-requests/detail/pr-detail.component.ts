﻿﻿import { Component, inject, signal, computed, input, OnInit, effect, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PurchaseRequestService } from '../../../core/services/purchase-request.service';
import { AuthService } from '../../../core/services/auth.service';
import { DatosMaestrosService } from '../../../core/services/datos-maestros.service';
import { TiposDocumentoService } from '../../../core/services/tipos-compra.service';
import { WorkflowService } from '../../../core/services/workflow.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { InversionesService } from '../../../core/services/inversiones.service';
import { WfInstancia, WfFlujo, WfCondicionFlujo, WfCondicionNivel, WfOperador } from '../../../core/models/workflow.model';
import { ApiUsuario } from '../../../core/models/api-usuario.model';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { TypeaheadInputComponent } from '../../../shared/components/typeahead-input/typeahead-input.component';
import { PurchaseRequest } from '../../../core/models/purchase-request.model';
import { ApiPresupuestoCreatePayload, ApiSolicitudUpdatePayload, ApiLineaUpdatePayload } from '../../../core/models/api-solicitud.model';
import { PRIORIDAD_TO_API } from '../../../core/services/purchase-request.service';

@Component({
  selector: 'app-pr-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent, StatusBadgeComponent, TypeaheadInputComponent],
  templateUrl: './pr-detail.component.html',
  styleUrl: './pr-detail.component.scss',
})
export class PrDetailComponent implements OnInit {
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private prService      = inject(PurchaseRequestService);
  private maestros       = inject(DatosMaestrosService);
  private tiposDocSvc    = inject(TiposDocumentoService);
  private wfSvc          = inject(WorkflowService);
  private usuariosSvc    = inject(UsuariosService);
  private inversionesSvc = inject(InversionesService);
  auth = inject(AuthService);

  wfInstancia        = signal<WfInstancia | null>(null);
  wfFlujo            = signal<WfFlujo | null>(null);
  wfInstanciaLoading = signal(false);
  wfLoadFailed       = signal(false);
  wfPreviewFlujo     = signal<WfFlujo | null>(null);
  wfPreviewLoading   = signal(false);

  proveedorOptions = computed(() =>
    this.maestros.proveedores().map(p => ({ label: p.nombre, sublabel: p.id, value: p.nombre }))
  );

  private tipoDocumento = computed(() => {
    const req = this.request();
    if (!req?.tipoDocumentoId) return null;
    return this.tiposDocSvc.tiposDocumento().find(x => x.id === req.tipoDocumentoId) ?? null;
  });

  tipoDocumentoNombre = computed(() => {
    const req = this.request();
    if (!req) return null;
    if (req.tipoDocumentoNombre) return req.tipoDocumentoNombre;
    const t = this.tipoDocumento();
    return t ? `${t.nombre} (${t.codigo})` : null;
  });

  tipoDocumentoDescripcion = computed(() => this.tipoDocumento()?.descripcion ?? null);

  inversionLabel = computed(() => {
    const req = this.request();
    if (!req?.inversion || !req.codigoInversion) return null;
    const inv = this.inversionesSvc.inversiones().find(i => i.codigo === req.codigoInversion);
    return inv ? `${inv.codigo} — ${inv.descripcion}` : req.codigoInversion;
  });

  aprobadorActual = computed(() => {
    const req = this.request();
    if (!req || req.status !== 'pending') return null;
    const usuarios = this.usuariosSvc.usuarios();

    // 1. Nombre directo de la solicitud (devuelto por el endpoint de detalle)
    if (req.aprobadorNombre) return req.aprobadorNombre;

    // 2. Buscar por aprobadorId de la solicitud en la lista de usuarios
    if (req.aprobadorId) {
      const u = usuarios.find(u => u.id === req.aprobadorId || u.email === req.aprobadorId);
      if (u) return u.nombre;
      // Si no está en la lista (usuario no-admin), cae al check de la instancia WF
    }

    // 3. Usar datos de la instancia de workflow si está cargada
    const inst = this.wfInstancia();
    if (!inst) return null;

    const nivelPendiente = inst.niveles?.find(n => n.estado === 'pendiente');
    if (nivelPendiente) {
      return this.resolveAprobador(nivelPendiente.tipoAprobador, nivelPendiente.aprobadorValor, nivelPendiente.aprobadorNombre, usuarios) ?? null;
    }

    const pasoPendiente = inst.pasos.find(p => p.estado === 'pendiente');
    return pasoPendiente?.aprobadorNombre ?? null;
  });

  wfPreview = computed(() => {
    const req = this.request();
    if (!req || req.status !== 'draft') return null;
    const flujo = this.wfPreviewFlujo();
    if (!flujo?.niveles.length) return null;
    const datos    = this.buildDatosDocumento(req);
    const usuarios = this.usuariosSvc.usuarios();
    return {
      flujoNombre: flujo.nombre,
      niveles: [...flujo.niveles]
        .sort((a, b) => a.orden - b.orden)
        .map(n => ({
          nombre:    n.nombre,
          aprobador: this.resolveAprobador(n.tipoAprobador, n.aprobadorValor, undefined, usuarios),
          saltado:   this.nivelSaltado(n.condiciones, datos),
        })),
    };
  });

  wfNivelesResueltos = computed(() => {
    const inst = this.wfInstancia();
    if (!inst?.niveles?.length) return null;
    const usuarios = this.usuariosSvc.usuarios();
    return inst.niveles.map(n => ({
      ...n,
      aprobadorDisplay: this.resolveAprobador(n.tipoAprobador, n.aprobadorValor, n.aprobadorNombre, usuarios),
    }));
  });

  pathSteps = computed(() => {
    const req        = this.request();
    const inst       = this.wfInstancia();
    const flujo      = this.wfFlujo();
    const usuarios   = this.usuariosSvc.usuarios();
    const wfLoading  = this.wfInstanciaLoading();

    type StepState = 'complete' | 'current' | 'future' | 'approved' | 'rejected' | 'skipped';
    interface PathStep {
      label: string; sub?: string; state: StepState;
      aprobador?: string; fecha?: Date; comentario?: string;
    }

    const steps: PathStep[] = [{
      label: 'Solicitud creada',
      sub: req ? `${req.requesterName} · ` : undefined,
      state: 'complete',
      fecha: req?.createdAt,
    }];

    if (inst) {
      const niveles = inst.niveles;
      if (niveles?.length) {
        // Mapa nivelId → definición del flujo (con condiciones) para pre-evaluar saltos
        const nivelDefMap = new Map((flujo?.niveles ?? []).map(n => [n.id!, n]));
        const datos = req ? this.buildDatosDocumento(req) : {};

        for (const nivel of niveles) {
          let state: StepState =
            nivel.estado === 'aprobado'   ? 'complete' :
            nivel.estado === 'rechazado'  ? 'rejected'  :
            nivel.estado === 'saltado'    ? 'skipped'   :
            nivel.estado === 'pendiente'  ? 'current'   : 'future';

          // Pre-evaluar si un nivel en espera se saltará según las condiciones del flujo
          if (state === 'future' && req) {
            const nivelDef = nivelDefMap.get(nivel.nivelId);
            if (nivelDef && this.nivelSaltado(nivelDef.condiciones, datos)) {
              state = 'skipped';
            }
          }

          steps.push({
            label:      nivel.nivelNombre,
            aprobador:  state === 'skipped' ? undefined
                          : this.resolveAprobador(nivel.tipoAprobador, nivel.aprobadorValor, nivel.aprobadorNombre, usuarios),
            comentario: nivel.comentario,
            fecha:      nivel.fechaAccion,
            state,
          });
        }
      } else {
        // Fallback: usar inst.pasos (estructura anterior)
        const datos = req ? this.buildDatosDocumento(req) : {};
        let currentAssigned = false;
        for (const paso of inst.pasos) {
          const nivelFlujo = flujo?.niveles.find(n => n.id === paso.nivelId);
          let state: StepState;
          if (paso.estado === 'aprobado') {
            state = 'complete';
          } else if (paso.estado === 'rechazado') {
            state = 'rejected';
          } else if (paso.estado === 'saltado') {
            state = 'skipped';
          } else if (!currentAssigned) {
            state = 'current';
            currentAssigned = true;
          } else {
            // Pre-evaluar salto si hay definición del flujo disponible
            state = (nivelFlujo && req && this.nivelSaltado(nivelFlujo.condiciones, datos))
              ? 'skipped'
              : 'future';
          }
          steps.push({
            label:      paso.nivelNombre ?? nivelFlujo?.nombre ?? 'Aprobación',
            aprobador:  state === 'skipped' ? undefined
                          : this.resolveAprobador(nivelFlujo?.tipoAprobador ?? '', nivelFlujo?.aprobadorValor ?? '', paso.aprobadorNombre, usuarios),
            comentario: paso.comentario,
            fecha:      paso.fechaAccion,
            state,
          });
        }
      }
      // Paso final de resolución
      const finalState: StepState =
        inst.estado === 'aprobado'  ? 'approved' :
        inst.estado === 'rechazado' ? 'rejected'  : 'future';
      steps.push({
        label: inst.estado === 'rechazado' ? 'Rechazada' : 'Aprobada',
        state: finalState,
      });
    } else if (req?.status === 'draft') {
      const preview = this.wfPreview();
      if (preview?.niveles.length) {
        for (const n of preview.niveles) {
          steps.push({
            label:     n.nombre,
            aprobador: n.saltado ? undefined : n.aprobador,
            state:     n.saltado ? 'skipped' : 'future',
          });
        }
        steps.push({ label: 'Aprobada', state: 'future' });
      } else {
        steps.push({ label: 'Pendiente de envío', state: 'future' });
      }
    } else if (req?.status === 'pending') {
      steps.push({
        label:     wfLoading ? 'Cargando flujo...' : 'Pendiente de aprobación',
        aprobador: wfLoading ? undefined : (this.aprobadorActual() ?? undefined),
        state:     'current',
      });
      if (!wfLoading) steps.push({ label: 'Aprobada', state: 'future' });
    } else if (req?.status === 'approved') {
      steps.push({ label: 'Aprobada', state: 'approved', fecha: req.approvedAt });
    } else if (req?.status === 'rejected') {
      steps.push({ label: 'Rechazada', state: 'rejected', fecha: req.rejectedAt });
    }

    return steps;
  });

  detailId   = input<string | undefined>(undefined);
  isEmbedded = input<boolean>(false);

  private resolvedId = computed(() =>
    this.detailId() ?? this.route.snapshot.paramMap.get('id') ?? ''
  );

  request = computed<PurchaseRequest | undefined>(() =>
    this.prService.requests().find(r => r.id === this.resolvedId())
  );

  // Approve / Reject
  showApproveModal = signal(false);
  showRejectModal  = signal(false);
  approveComment   = signal('');
  rejectReason     = signal('');
  processing       = signal(false);
  actionError      = signal('');
  exporting        = signal(false);

  deletingPresupuesto = signal<string | null>(null);

  // Add presupuesto modal
  showAddModal      = signal(false);
  modalProveedor    = signal('');
  modalProveedorId  = signal('');
  modalPrecio       = signal<number | null>(null);
  modalFecha        = signal('');
  modalNumeroOferta  = signal('');
  modalComentarios   = signal('');
  modalFileName      = signal('');
  modalFileSize     = signal(0);
  modalFileData     = signal('');
  modalSaving       = signal(false);

  constructor() {
    effect(() => {
      const id = this.resolvedId();
      if (!id) return;
      this.prService.loadById(id);
      this.prService.loadPresupuestos(id);
      this.wfInstancia.set(null);
      this.wfFlujo.set(null);
      this.wfLoadFailed.set(false);
      this.wfPreviewFlujo.set(null);
      this.loadWfInstancia();
    });

    // Fallback: cargar el tipo de documento individualmente si la lista no está disponible
    effect(() => {
      const id = this.request()?.tipoDocumentoId;
      if (!id || this.tiposDocSvc.tiposDocumento().some(t => t.id === id)) return;
      untracked(() => this.tiposDocSvc.loadOne(id));
    });

    // Load the preview flujo when the request is a draft
    effect(() => {
      const req      = this.request();
      const tipoDocId = req?.tipoDocumentoId;
      if (!req || req.status !== 'draft' || !tipoDocId) {
        this.wfPreviewFlujo.set(null);
        return;
      }
      const flujos = this.wfSvc.flujos();
      if (!flujos.length) return;

      const datos = this.buildDatosDocumento(req);
      const matching =
        flujos.find(f => f.activo && f.documento === tipoDocId && this.evalCondiciones(f.condiciones, datos)) ??
        flujos.find(f => f.activo && f.documento === tipoDocId);
      if (!matching?.id) { this.wfPreviewFlujo.set(null); return; }

      // Skip fetch if we already have this flujo loaded
      if (untracked(() => this.wfPreviewFlujo())?.id === matching.id) return;

      if (matching.niveles.length > 0) {
        this.wfPreviewFlujo.set(matching);
        return;
      }
      this.wfPreviewLoading.set(true);
      this.wfSvc.getFlujoById(matching.id).subscribe({
        next:  f  => { this.wfPreviewFlujo.set(f); this.wfPreviewLoading.set(false); },
        error: () => this.wfPreviewLoading.set(false),
      });
    });
  }

  ngOnInit(): void {
    this.tiposDocSvc.load();
    this.usuariosSvc.load();
    this.inversionesSvc.load();
    if (!this.wfSvc.flujos().length) this.wfSvc.loadFlujos();
  }

  reloadWfInstancia(): void {
    this.wfLoadFailed.set(false);
    this.loadWfInstancia();
  }

  private loadWfInstancia(retry = 3, delayMs = 0): void {
    const id        = this.resolvedId();
    const tipoDocId = untracked(() => this.request()?.tipoDocumentoId);
    if (!id) return;

    // tipoDocumentoId puede no estar disponible aún si loadById no ha terminado
    if (!tipoDocId) {
      this.wfInstanciaLoading.set(true);
      setTimeout(() => {
        if (untracked(() => this.request()?.tipoDocumentoId)) this.loadWfInstancia(retry);
        else this.wfInstanciaLoading.set(false);
      }, 800);
      return;
    }

    this.wfInstanciaLoading.set(true);
    this.wfLoadFailed.set(false);

    const attempt = () => {
      this.wfSvc.getInstanciasSolicitud(tipoDocId, id).subscribe({
        next: inst => {
          this.wfInstancia.set(inst);
          this.wfInstanciaLoading.set(false);
          this.wfSvc.getFlujoById(inst.flujoId).subscribe({
            next:  flujo => this.wfFlujo.set(flujo),
            error: ()    => this.wfFlujo.set(null),
          });
        },
        error: (err) => {
          const isNotFound = err.status === 404;
          if (isNotFound) {
            this.wfInstancia.set(null);
            this.wfInstanciaLoading.set(false);
            return;
          }
          if (retry > 0) {
            setTimeout(() => this.loadWfInstancia(retry - 1), 2000);
          } else {
            this.wfInstancia.set(null);
            this.wfInstanciaLoading.set(false);
            this.wfLoadFailed.set(true);
          }
        },
      });
    };

    if (delayMs > 0) setTimeout(attempt, delayMs);
    else attempt();
  }

  // ── Acciones de flujo ──────────────────────────────────────────────────────

  submitDraft(): void {
    const id = this.resolvedId();
    if (!id) return;
    this.processing.set(true);
    this.actionError.set('');
    this.prService.enviar(id).subscribe({
      next: () => {
        this.prService.loadById(id);
        this.wfFlujo.set(null);
        this.loadWfInstancia(3, 1500);
        this.processing.set(false);
      },
      error: err => {
        const msg = err.error?.mensaje ?? err.error?.message ?? err.error?.error ?? `Error ${err.status}`;
        this.actionError.set(msg);
        this.processing.set(false);
      },
    });
  }

  approve(): void {
    const inst = this.wfInstancia();
    if (!inst) { this.actionError.set('No se encontró el flujo de aprobación'); return; }
    this.processing.set(true);
    this.actionError.set('');
    this.wfSvc.aprobar(inst.id, this.approveComment() || undefined).subscribe({
      next: () => {
        this.prService.loadById(this.resolvedId());
        this.wfFlujo.set(null);
        this.loadWfInstancia();
        this.showApproveModal.set(false);
        this.processing.set(false);
      },
      error: err => {
        this.actionError.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.processing.set(false);
      },
    });
  }

  reject(): void {
    if (!this.rejectReason()) return;
    const inst = this.wfInstancia();
    if (!inst) { this.actionError.set('No se encontró el flujo de aprobación'); return; }
    this.processing.set(true);
    this.actionError.set('');
    this.wfSvc.rechazar(inst.id, this.rejectReason()).subscribe({
      next: () => {
        this.prService.loadById(this.resolvedId());
        this.wfFlujo.set(null);
        this.loadWfInstancia();
        this.showRejectModal.set(false);
        this.processing.set(false);
      },
      error: err => {
        this.actionError.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.processing.set(false);
      },
    });
  }

  exportarSage(req: PurchaseRequest): void {
    if (!confirm(`¿Exportar la solicitud ${req.requestNumber} a Sage ERP?`)) return;
    this.exporting.set(true);
    this.actionError.set('');
    this.prService.exportarSage(req.id).subscribe({
      next: res => {
        this.exporting.set(false);
        alert(`Exportada correctamente. N° Pedido Sage: ${res.numeroPedido}`);
      },
      error: err => {
        this.actionError.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.exporting.set(false);
      },
    });
  }

  deleteRequest(req: PurchaseRequest): void {
    if (!confirm(`¿Eliminar la solicitud ${req.requestNumber}? Esta acción no se puede deshacer.`)) return;
    this.processing.set(true);
    this.actionError.set('');
    this.prService.delete(req.id).subscribe({
      next: () => {
        this.processing.set(false);
        if (!this.isEmbedded()) this.router.navigate(['/solicitudes']);
      },
      error: err => {
        this.actionError.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.processing.set(false);
      },
    });
  }

  // ── Presupuestos (local hasta que exista endpoint) ─────────────────────────

  openAddModal(): void {
    this.modalProveedor.set('');
    this.modalProveedorId.set('');
    this.modalPrecio.set(null);
    this.modalFecha.set('');
    this.modalNumeroOferta.set('');
    this.modalComentarios.set('');
    this.modalFileName.set('');
    this.modalFileSize.set(0);
    this.modalFileData.set('');
    this.showAddModal.set(true);
  }

  onModalProveedorChange(nombre: string): void {
    this.modalProveedor.set(nombre);
    const match = this.maestros.proveedores().find(p => p.nombre === nombre);
    this.modalProveedorId.set(match?.id ?? '');
  }

  onModalFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    input.value = '';
    if (!file || file.type !== 'application/pdf' || file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.modalFileName.set(file.name);
      this.modalFileSize.set(file.size);
      this.modalFileData.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  get modalValid(): boolean {
    return !!this.modalProveedor().trim() &&
           Number(this.modalPrecio()) > 0 &&
           !!this.modalFecha();
  }

  savePresupuesto(): void {
    if (!this.modalValid) return;
    this.modalSaving.set(true);
    const payload: ApiPresupuestoCreatePayload = {
      proveedor: this.modalProveedor().trim(),
      precio:    Number(this.modalPrecio()),
      fecha:     this.modalFecha(),
      ...(this.modalNumeroOferta().trim() ? { numeroOferta: this.modalNumeroOferta().trim() } : {}),
      ...(this.modalComentarios().trim()  ? { comentarios:  this.modalComentarios().trim()  } : {}),
      ...(this.modalFileData() ? {
        fileName: this.modalFileName(),
        fileSize: this.modalFileSize(),
        fileData: this.modalFileData(),
      } : {}),
    };
    this.prService.createPresupuesto(this.resolvedId(), payload).subscribe({
      next: () => {
        this.showAddModal.set(false);
        this.modalSaving.set(false);
        this.syncProveedorFromPresupuesto();
      },
      error: err => {
        this.actionError.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.modalSaving.set(false);
      },
    });
  }

  nivelEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente', esperando: 'Esperando',
      aprobado: 'Aprobado', rechazado: 'Rechazado', saltado: 'Saltado',
    };
    return map[estado] ?? estado;
  }

  private buildDatosDocumento(req: PurchaseRequest): Record<string, unknown> {
    // Prioridad en español tal como la almacena el backend
    const prioridadEs: Record<string, string> = { low: 'baja', medium: 'media', high: 'alta', urgent: 'urgente' };
    const prio = prioridadEs[req.priority] ?? req.priority;
    return {
      // Importe — todas las variantes que puede usar el admin al configurar el campo
      importe:              req.totalAmount,
      importeTotal:         req.totalAmount,
      importe_total:        req.totalAmount,
      total:                req.totalAmount,
      totalAmount:          req.totalAmount,
      // Departamento
      departamento:              req.requesterDepartment,
      solicitanteDepartamento:   req.requesterDepartment,
      department:                req.requesterDepartment,
      // Prioridad en español (backend) y en inglés (frontend)
      prioridad:            prio,
      priority:             req.priority,
      // Inversión
      inversion:            req.inversion ?? false,
      // GIM
      gimId:                req.gimId ?? null,
      gim:                  req.gimId ?? null,
      // Tipo documento
      tipoDocumento:        req.tipoDocumentoId ?? '',
      // Solicitante
      solicitante:          req.requesterId,
      solicitanteId:        req.requesterId,
    };
  }

  private evalCondicion(c: { campo: string; operador: WfOperador; valor: string }, datos: Record<string, unknown>): boolean {
    const val = datos[c.campo];
    if (val === undefined || val === null) return false;
    const ref = c.valor;
    switch (c.operador) {
      case '=':        return String(val) === ref;
      case '!=':       return String(val) !== ref;
      case '>':        return Number(val) > Number(ref);
      case '<':        return Number(val) < Number(ref);
      case '>=':       return Number(val) >= Number(ref);
      case '<=':       return Number(val) <= Number(ref);
      case 'in':       return ref.split(',').map(v => v.trim()).includes(String(val));
      case 'contains': return String(val).toLowerCase().includes(ref.toLowerCase());
      default:         return false;
    }
  }

  private evalCondiciones(condiciones: WfCondicionFlujo[], datos: Record<string, unknown>): boolean {
    if (!condiciones.length) return true;
    const sorted = [...condiciones].sort((a, b) => a.orden - b.orden);
    let result = this.evalCondicion(sorted[0], datos);
    for (let i = 1; i < sorted.length; i++) {
      const v = this.evalCondicion(sorted[i], datos);
      result = sorted[i].logica === 'OR' ? result || v : result && v;
    }
    return result;
  }

  private nivelSaltado(condiciones: WfCondicionNivel[], datos: Record<string, unknown>): boolean {
    const skipConds = condiciones.filter(c => c.accion === 'saltar');
    if (!skipConds.length) return false;
    const sorted = [...skipConds].sort((a, b) => a.orden - b.orden);
    let result = this.evalCondicion(sorted[0], datos);
    for (let i = 1; i < sorted.length; i++) {
      const v = this.evalCondicion(sorted[i], datos);
      result = sorted[i].logica === 'OR' ? result || v : result && v;
    }
    return result;
  }

  private resolveAprobador(
    tipoAprobador: string,
    aprobadorValor: string,
    aprobadorNombre: string | undefined | null,
    usuarios: ApiUsuario[],
  ): string | undefined {
    if (aprobadorNombre) return aprobadorNombre;
    if (!aprobadorValor) return undefined;
    if (tipoAprobador === 'departamento') return `Dpto. ${aprobadorValor}`;
    if (tipoAprobador === 'rol') return aprobadorValor;
    const u = usuarios.find(u => u.id === aprobadorValor || u.email === aprobadorValor);
    return u?.nombre;
  }

  private syncProveedorFromPresupuesto(): void {
    const req     = this.request();
    const provId  = this.modalProveedorId();
    if (!req || !provId || req.proveedorId) return;
    const updatePayload: ApiSolicitudUpdatePayload = {
      titulo:               req.title,
      descripcion:          req.description,
      prioridad:            PRIORIDAD_TO_API[req.priority] ?? req.priority,
      ordenMantenimiento:   req.ordenMantenimiento,
      proveedorId:          provId,
      proveedorNombre:      this.modalProveedor().trim(),
      referencia:           req.referencia,
      fechaEntregaPrevista: req.expectedDeliveryDate?.toISOString().split('T')[0],
      tipoDocumentoId:      req.tipoDocumentoId,
      inversion:            req.inversion,
      codigoInversion:      req.codigoInversion,
      compradorId:          req.compradorId,
      formaPagoId:          req.formaPagoId,
      lineas:               req.items.map((item): ApiLineaUpdatePayload => ({
        articuloId:     item.articuloId,
        articuloNombre: item.articuloNombre,
        articuloRefId:  item.articuloRefId,
        descripcion:    item.description,
        cantidad:       item.quantity,
        precioUnitario: item.unitPrice,
        unidad:         item.unit,
        orden:          item.orden,
      })),
    };
    this.prService.update(req.id, updatePayload).subscribe();
  }

  openPresupuesto(p: { fileUrl: string }): void {
    window.open(p.fileUrl, '_blank');
  }

  onDeletePresupuesto(presupuestoId: string): void {
    if (!confirm('¿Eliminar este presupuesto? Esta acción no se puede deshacer.')) return;
    this.deletingPresupuesto.set(presupuestoId);
    this.prService.deletePresupuesto(this.resolvedId(), presupuestoId).subscribe({
      next: () => this.deletingPresupuesto.set(null),
      error: err => {
        this.actionError.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.deletingPresupuesto.set(null);
      },
    });
  }
}
