import { Component, inject, signal, computed, input, OnInit, effect } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PurchaseRequestService } from '../../../core/services/purchase-request.service';
import { AuthService } from '../../../core/services/auth.service';
import { DatosMaestrosService } from '../../../core/services/datos-maestros.service';
import { TiposDocumentoService } from '../../../core/services/tipos-compra.service';
import { WorkflowService } from '../../../core/services/workflow.service';
import { WfInstancia } from '../../../core/models/workflow.model';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { TypeaheadInputComponent } from '../../../shared/components/typeahead-input/typeahead-input.component';
import { PurchaseRequest, Presupuesto } from '../../../core/models/purchase-request.model';

@Component({
  selector: 'app-pr-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent, StatusBadgeComponent, TypeaheadInputComponent],
  templateUrl: './pr-detail.component.html',
  styleUrl: './pr-detail.component.scss',
})
export class PrDetailComponent implements OnInit {
  private route          = inject(ActivatedRoute);
  private prService      = inject(PurchaseRequestService);
  private maestros       = inject(DatosMaestrosService);
  private tiposDocSvc    = inject(TiposDocumentoService);
  private wfSvc          = inject(WorkflowService);
  auth = inject(AuthService);

  wfInstancia = signal<WfInstancia | null>(null);

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
    return t ? `${t.nombre} (${t.codigo})` : (req.tipoDocumentoId ?? null);
  });

  tipoDocumentoDescripcion = computed(() => this.tipoDocumento()?.descripcion ?? null);

  aprobadorActual = computed(() => {
    const req = this.request();
    if (!req || req.status !== 'pending') return null;
    if (req.aprobadorNombre) return req.aprobadorNombre;
    // Fallback: paso pendiente del workflow
    const inst = this.wfInstancia();
    if (!inst) return null;
    const pasoPendiente = inst.pasos.find(p => p.estado === 'pendiente');
    return pasoPendiente?.aprobadorNombre ?? null;
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

  // Add presupuesto modal
  showAddModal   = signal(false);
  modalProveedor = signal('');
  modalPrecio    = signal<number | null>(null);
  modalFecha     = signal('');
  modalFileName  = signal('');
  modalFileSize  = signal(0);
  modalFileData  = signal('');
  modalSaving    = signal(false);

  constructor() {
    // Ensure detail data is always fresh from API
    effect(() => {
      const id = this.resolvedId();
      if (id) this.prService.loadById(id);
    });
  }

  ngOnInit(): void {
    this.tiposDocSvc.load();
    this.loadWfInstancia();
  }

  private loadWfInstancia(): void {
    const id = this.resolvedId();
    if (!id) return;
    this.wfSvc.getInstanciasSolicitud(id).subscribe({
      next:  inst => this.wfInstancia.set(inst),
      error: ()   => this.wfInstancia.set(null),
    });
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

  // ── Presupuestos (local hasta que exista endpoint) ─────────────────────────

  openAddModal(): void {
    this.modalProveedor.set('');
    this.modalPrecio.set(null);
    this.modalFecha.set('');
    this.modalFileName.set('');
    this.modalFileSize.set(0);
    this.modalFileData.set('');
    this.showAddModal.set(true);
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
           (this.modalPrecio() ?? 0) > 0 &&
           !!this.modalFecha() &&
           !!this.modalFileData();
  }

  savePresupuesto(): void {
    if (!this.modalValid) return;
    this.modalSaving.set(true);
    const data: Omit<Presupuesto, 'id'> = {
      proveedor: this.modalProveedor().trim(),
      precio:    this.modalPrecio()!,
      fecha:     this.modalFecha(),
      fileName:  this.modalFileName(),
      fileSize:  this.modalFileSize(),
      fileData:  this.modalFileData(),
    };
    setTimeout(() => {
      this.prService.addPresupuesto(this.resolvedId(), data);
      this.showAddModal.set(false);
      this.modalSaving.set(false);
    }, 300);
  }

  openPresupuesto(p: Presupuesto): void {
    const byteString = atob(p.fileData.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob), '_blank');
  }
}
