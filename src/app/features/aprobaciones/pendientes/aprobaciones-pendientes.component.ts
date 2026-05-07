import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WorkflowService } from '../../../core/services/workflow.service';
import { PurchaseRequestService } from '../../../core/services/purchase-request.service';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { WfPendiente } from '../../../core/models/workflow.model';

@Component({
  selector: 'app-aprobaciones-pendientes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
  templateUrl: './aprobaciones-pendientes.component.html',
  styleUrl: './aprobaciones-pendientes.component.scss',
})
export class AprobacionesPendientesComponent implements OnInit {
  private wfSvc   = inject(WorkflowService);
  private prSvc   = inject(PurchaseRequestService);

  pendientes   = signal<WfPendiente[]>([]);
  loading      = signal(true);
  error        = signal('');

  processingId = signal<string | null>(null);
  actionError  = signal('');

  showApproveModal = signal(false);
  showRejectModal  = signal(false);
  selectedItem     = signal<WfPendiente | null>(null);
  comment          = signal('');
  rejectReason     = signal('');

  /** Enriquece cada pendiente con los datos completos de la solicitud */
  enriched = computed(() => {
    const requests = this.prSvc.requests();
    return this.pendientes().map(p => {
      const sol = requests.find(r => r.id === p.documentoId);
      if (!sol) return p;
      return {
        ...p,
        solicitudNumero:     sol.requestNumber   || p.solicitudNumero,
        solicitudTitulo:     sol.title           || p.solicitudTitulo,
        solicitanteNombre:   sol.requesterName   || p.solicitanteNombre,
        departamento:        sol.requesterDepartment || p.departamento,
        tipoDocumentoNombre: sol.tipoDocumentoNombre || p.tipoDocumentoNombre,
        importeTotal:        sol.totalAmount     ?? p.importeTotal,
      };
    });
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    // Carga solicitudes en paralelo para enriquecimiento inmediato
    this.prSvc.loadSolicitudes();
    this.wfSvc.getPendientes().subscribe({
      next: items => {
        this.pendientes.set(items);
        this.loading.set(false);
        // Si algún documentoId no está en caché, cargarlo individualmente
        const cached = new Set(this.prSvc.requests().map(r => r.id));
        items.filter(p => !cached.has(p.documentoId))
             .forEach(p => this.prSvc.loadById(p.documentoId));
      },
      error: err => {
        this.error.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.loading.set(false);
      },
    });
  }

  openApprove(item: WfPendiente): void {
    this.selectedItem.set(item);
    this.comment.set('');
    this.showApproveModal.set(true);
  }

  openReject(item: WfPendiente): void {
    this.selectedItem.set(item);
    this.rejectReason.set('');
    this.showRejectModal.set(true);
  }

  confirmarAprobacion(): void {
    const item = this.selectedItem();
    if (!item) return;
    this.processingId.set(item.instanciaId);
    this.actionError.set('');
    this.wfSvc.aprobar(item.instanciaId, this.comment() || undefined).subscribe({
      next: () => {
        this.pendientes.update(list => list.filter(p => p.instanciaId !== item.instanciaId));
        this.showApproveModal.set(false);
        this.processingId.set(null);
      },
      error: err => {
        this.actionError.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.processingId.set(null);
      },
    });
  }

  confirmarRechazo(): void {
    const item = this.selectedItem();
    if (!item || !this.rejectReason()) return;
    this.processingId.set(item.instanciaId);
    this.actionError.set('');
    this.wfSvc.rechazar(item.instanciaId, this.rejectReason()).subscribe({
      next: () => {
        this.pendientes.update(list => list.filter(p => p.instanciaId !== item.instanciaId));
        this.showRejectModal.set(false);
        this.processingId.set(null);
      },
      error: err => {
        this.actionError.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.processingId.set(null);
      },
    });
  }
}
