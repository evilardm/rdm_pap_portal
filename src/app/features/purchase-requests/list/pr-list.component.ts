import { Component, inject, signal, computed, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PurchaseRequestService } from '../../../core/services/purchase-request.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { PrDetailComponent } from '../detail/pr-detail.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PurchaseRequest, PurchaseRequestFilter, RequestStatus, RequestPriority } from '../../../core/models/purchase-request.model';

interface Tab { id: string; label: string; }

@Component({
  selector: 'app-pr-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, StatusBadgeComponent, PrDetailComponent, PaginatorComponent],
  templateUrl: './pr-list.component.html',
  styleUrl: './pr-list.component.scss',
})
export class PrListComponent implements OnInit {
  prService = inject(PurchaseRequestService);

  filter = signal<PurchaseRequestFilter>({ status: 'all', priority: 'all', search: '' });
  filteredRequests = computed(() => this.prService.getFiltered(this.filter()));

  page     = signal(1);
  pageSize = signal(20);

  currentPage = computed(() =>
    Math.min(this.page(), Math.max(1, Math.ceil(this.filteredRequests().length / this.pageSize())))
  );

  paginatedRequests = computed(() => {
    const p = this.currentPage(), s = this.pageSize();
    return this.filteredRequests().slice((p - 1) * s, p * s);
  });

  activeTab = signal<string>('list');
  openTabs  = signal<Tab[]>([]);

  statusOptions: { value: RequestStatus | 'all'; label: string }[] = [
    { value: 'all',      label: 'Todos los estados' },
    { value: 'pending',  label: 'Pendiente' },
    { value: 'approved', label: 'Aprobada' },
    { value: 'rejected', label: 'Rechazada' },
    { value: 'draft',    label: 'Borrador' },
  ];

  priorityOptions: { value: RequestPriority | 'all'; label: string }[] = [
    { value: 'all',    label: 'Todas las prioridades' },
    { value: 'urgent', label: 'Urgente' },
    { value: 'high',   label: 'Alta' },
    { value: 'medium', label: 'Media' },
    { value: 'low',    label: 'Baja' },
  ];

  constructor() {
    effect(() => { this.filter(); this.page.set(1); }, { allowSignalWrites: true });
  }

  onPageSizeChange(n: number): void { this.pageSize.set(n); this.page.set(1); }

  ngOnInit(): void {
    this.prService.loadSolicitudes();
  }

  openTab(req: PurchaseRequest): void {
    if (!this.openTabs().some(t => t.id === req.id)) {
      this.openTabs.update(tabs => [...tabs, { id: req.id, label: req.requestNumber }]);
    }
    this.activeTab.set(req.id);
  }

  closeTab(event: Event, id: string): void {
    event.stopPropagation();
    const remaining = this.openTabs().filter(t => t.id !== id);
    this.openTabs.set(remaining);
    if (this.activeTab() === id) {
      this.activeTab.set(remaining.length > 0 ? remaining[remaining.length - 1].id : 'list');
    }
  }

  updateSearch(value: string):   void { this.filter.update(f => ({ ...f, search: value })); }
  updateStatus(value: string):   void { this.filter.update(f => ({ ...f, status: value as RequestStatus | 'all' })); }
  updatePriority(value: string): void { this.filter.update(f => ({ ...f, priority: value as RequestPriority | 'all' })); }
  clearFilters(): void { this.filter.set({ status: 'all', priority: 'all', search: '' }); }
}
