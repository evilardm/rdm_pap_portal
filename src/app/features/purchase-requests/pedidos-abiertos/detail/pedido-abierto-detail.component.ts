import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidosAbiertosService } from '../../../../core/services/pedidos-abiertos.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { DocumentoAdjunto, DocumentoCreatePayload, PedidoAbierto } from '../../../../core/models/pedido-abierto.model';

@Component({
  selector: 'app-pedido-abierto-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent],
  templateUrl: './pedido-abierto-detail.component.html',
  styleUrl: './pedido-abierto-detail.component.scss',
})
export class PedidoAbiertoDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  svc = inject(PedidosAbiertosService);

  private id = this.route.snapshot.paramMap.get('id') ?? '';

  pedido = computed<PedidoAbierto | undefined>(() =>
    this.svc.pedidos().find(p => p.id === this.id)
  );

  actionError = signal('');

  ngOnInit(): void {
    this.svc.loadById(this.id);
  }

  // ── Add documento modal ───────────────────────────────────
  showAddModal  = signal(false);
  modalNombre   = signal('');
  modalDesc     = signal('');
  modalFileName = signal('');
  modalFileSize = signal(0);
  modalFileData = signal('');
  modalSaving   = signal(false);

  get modalValid(): boolean {
    return !!this.modalNombre().trim() && !!this.modalFileData();
  }

  openAddModal(): void {
    this.modalNombre.set('');
    this.modalDesc.set('');
    this.modalFileName.set('');
    this.modalFileSize.set(0);
    this.modalFileData.set('');
    this.actionError.set('');
    this.showAddModal.set(true);
  }

  onModalFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || file.type !== 'application/pdf') return;
    if (file.size > 10 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.modalFileName.set(file.name);
      this.modalFileSize.set(file.size);
      this.modalFileData.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  saveDocumento(): void {
    if (!this.modalValid) return;
    this.modalSaving.set(true);
    const payload: DocumentoCreatePayload = {
      nombre:      this.modalNombre().trim(),
      descripcion: this.modalDesc().trim() || undefined,
      fileName:    this.modalFileName(),
      fileSize:    this.modalFileSize(),
      fileData:    this.modalFileData(),
    };
    this.svc.addDocumento(this.id, payload).subscribe({
      next: () => {
        this.showAddModal.set(false);
        this.modalSaving.set(false);
      },
      error: err => {
        this.actionError.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.modalSaving.set(false);
      },
    });
  }

  // ── Document actions ─────────────────────────────────────
  openPdf(doc: DocumentoAdjunto): void {
    window.open(doc.fileUrl, '_blank');
  }

  removeDocumento(docId: string): void {
    if (!confirm('¿Eliminar este documento?')) return;
    this.svc.removeDocumento(this.id, docId).subscribe({
      error: err => this.actionError.set(err.error?.mensaje ?? `Error ${err.status}`),
    });
  }

  // ── Historial de precios ──────────────────────────────────
  showPrecioModal  = signal(false);
  precioModalMes   = signal('');
  precioModalVal   = signal<number | null>(null);
  precioModalNotas = signal('');
  precioSaving     = signal(false);

  get precioModalValid(): boolean {
    return !!this.precioModalMes() && (this.precioModalVal() ?? 0) > 0;
  }

  openPrecioModal(): void {
    this.precioModalMes.set('');
    this.precioModalVal.set(null);
    this.precioModalNotas.set('');
    this.actionError.set('');
    this.showPrecioModal.set(true);
  }

  savePrecio(): void {
    if (!this.precioModalValid) return;
    this.precioSaving.set(true);
    this.svc.addPrecio(this.id, {
      mes:    this.precioModalMes(),
      precio: this.precioModalVal()!,
      notas:  this.precioModalNotas().trim() || undefined,
    }).subscribe({
      next: () => {
        this.showPrecioModal.set(false);
        this.precioSaving.set(false);
      },
      error: err => {
        this.actionError.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.precioSaving.set(false);
      },
    });
  }

  removePrecio(precioId: string): void {
    if (!confirm('¿Eliminar este precio?')) return;
    this.svc.removePrecio(this.id, precioId).subscribe({
      error: err => this.actionError.set(err.error?.mensaje ?? `Error ${err.status}`),
    });
  }

  // ── Helpers ──────────────────────────────────────────────
  formatMes(mes: string): string {
    const [year, month] = mes.split('-');
    const nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${nombres[+month - 1]} ${year}`;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  statusLabel(s: string): string {
    return { abierto: 'Abierto', cerrado: 'Cerrado', cancelado: 'Cancelado' }[s] ?? s;
  }
}
