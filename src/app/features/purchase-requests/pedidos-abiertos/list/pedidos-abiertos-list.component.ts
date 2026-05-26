import { Component, inject, signal, computed, effect, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PedidosAbiertosService } from '../../../../core/services/pedidos-abiertos.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { PaginatorComponent } from '../../../../shared/components/paginator/paginator.component';
import { PedidoAbiertoStatus } from '../../../../core/models/pedido-abierto.model';

@Component({
  selector: 'app-pedidos-abiertos-list',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, PaginatorComponent],
  templateUrl: './pedidos-abiertos-list.component.html',
  styleUrl: './pedidos-abiertos-list.component.scss',
})
export class PedidosAbiertosListComponent implements OnInit {
  private router = inject(Router);
  svc = inject(PedidosAbiertosService);

  search       = signal('');
  filterStatus = signal<PedidoAbiertoStatus | 'all'>('all');
  page         = signal(1);
  pageSize     = signal(20);
  deleting     = signal(false);

  statusOptions: { value: PedidoAbiertoStatus | 'all'; label: string }[] = [
    { value: 'all',       label: 'Todos los estados' },
    { value: 'abierto',   label: 'Abierto' },
    { value: 'cerrado',   label: 'Cerrado' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  filtered = computed(() => {
    const q = this.search().toLowerCase();
    const st = this.filterStatus();
    return this.svc.pedidos().filter(p => {
      if (st !== 'all' && p.status !== st) return false;
      if (q && !p.numero.toLowerCase().includes(q) &&
               !p.proveedor.toLowerCase().includes(q) &&
               !p.descripcion.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  hasFilters = computed(() => this.search() !== '' || this.filterStatus() !== 'all');

  currentPage = computed(() =>
    Math.min(this.page(), Math.max(1, Math.ceil(this.filtered().length / this.pageSize())))
  );

  paginated = computed(() => {
    const p = this.currentPage(), s = this.pageSize();
    return this.filtered().slice((p - 1) * s, p * s);
  });

  constructor() {
    effect(() => { this.search(); this.filterStatus(); this.page.set(1); }, { allowSignalWrites: true });
  }

  ngOnInit(): void { this.svc.load(); }

  onPageSizeChange(n: number): void { this.pageSize.set(n); this.page.set(1); }

  clearFilters(): void {
    this.search.set('');
    this.filterStatus.set('all');
  }

  openDetail(id: string): void {
    this.router.navigate(['/solicitudes/pedidos-abiertos', id]);
  }

  onDelete(event: Event, id: string): void {
    event.stopPropagation();
    if (!confirm('¿Eliminar este pedido abierto?')) return;
    this.deleting.set(true);
    this.svc.delete(id).subscribe({
      next: () => this.deleting.set(false),
      error: err => {
        alert(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.deleting.set(false);
      },
    });
  }

  statusLabel(s: PedidoAbiertoStatus): string {
    return { abierto: 'Abierto', cerrado: 'Cerrado', cancelado: 'Cancelado' }[s];
  }
}
