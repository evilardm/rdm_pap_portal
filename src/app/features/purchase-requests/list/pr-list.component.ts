import { Component, HostListener, inject, signal, computed, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PurchaseRequestService } from '../../../core/services/purchase-request.service';
import { AuthService } from '../../../core/services/auth.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { PrDetailComponent } from '../detail/pr-detail.component';
import { PrCreateComponent } from '../create/pr-create.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PurchaseRequest, PurchaseRequestFilter, RequestStatus, RequestPriority } from '../../../core/models/purchase-request.model';
import { InversionesService } from '../../../core/services/inversiones.service';

interface Tab { id: string; label: string; type: 'detail' | 'create'; }

interface ColDef { key: string; label: string; visible: boolean; width: number; }

const COL_KEY = 'rdm-pr-cols-v2';

const DEFAULT_COLS: ColDef[] = [
  { key: 'requestNumber',       label: 'N° Solicitud', visible: true,  width: 130 },
  { key: 'referencia',          label: 'Referencia',   visible: true,  width: 110 },
  { key: 'title',               label: 'Título',        visible: true,  width: 220 },
  { key: 'requesterName',       label: 'Solicitante',   visible: true,  width: 140 },
  { key: 'requesterDepartment', label: 'Departamento',  visible: true,  width: 130 },
  { key: 'totalAmount',         label: 'Importe',       visible: true,  width: 100 },
  { key: 'approverName',        label: 'Aprobador',     visible: true,  width: 140 },
  { key: 'compradorName',        label: 'Comprador',     visible: true,  width: 140 },
  { key: 'ordenMantenimiento',  label: 'Orden Mant.',   visible: false, width: 110 },
  { key: 'codigoInversion',     label: 'Inversión',     visible: true,  width: 200 },
  { key: 'priority',            label: 'Prioridad',     visible: true,  width: 95  },
  { key: 'status',              label: 'Estado',        visible: true,  width: 95  },
  { key: 'createdAt',           label: 'Fecha',         visible: true,  width: 100 },
];

function loadCols(): ColDef[] {
  try {
    const raw = localStorage.getItem(COL_KEY);
    if (!raw) return DEFAULT_COLS.map(c => ({ ...c }));
    const saved: { key: string; visible: boolean; width: number }[] = JSON.parse(raw);
    const merged = saved
      .map(s => { const d = DEFAULT_COLS.find(x => x.key === s.key); return d ? { ...d, visible: s.visible, width: s.width } : null; })
      .filter((c): c is ColDef => c !== null);
    DEFAULT_COLS.forEach(d => { if (!merged.some(m => m.key === d.key)) merged.push({ ...d }); });
    return merged;
  } catch { return DEFAULT_COLS.map(c => ({ ...c })); }
}

@Component({
  selector: 'app-pr-list',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent, PrDetailComponent, PrCreateComponent, PaginatorComponent],
  templateUrl: './pr-list.component.html',
  styleUrl: './pr-list.component.scss',
})
export class PrListComponent implements OnInit, OnDestroy {
  prService      = inject(PurchaseRequestService);
  auth           = inject(AuthService);
  inversionesSvc = inject(InversionesService);

  filter = signal<PurchaseRequestFilter>({ status: 'all', priority: 'all', search: '' });
  filteredRequests = computed(() =>
    this.prService.getFiltered(this.filter()).filter(r => !!r.requestNumber)
  );

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

  selectedIds = signal<Set<string>>(new Set());

  allPageSelected = computed(() => {
    const page = this.paginatedRequests();
    return page.length > 0 && page.every(r => this.selectedIds().has(r.id));
  });

  somePageSelected = computed(() =>
    this.paginatedRequests().some(r => this.selectedIds().has(r.id)) && !this.allPageSelected()
  );

  // ── Column management ─────────────────────────────────────────────────────

  cols        = signal<ColDef[]>(loadCols());
  visibleCols = computed(() => this.cols().filter(c => c.visible));
  tableWidth  = computed(() => 40 + this.visibleCols().reduce((s, c) => s + c.width, 0));
  showColMenu = signal(false);
  dragOverKey = signal<string | null>(null);

  readonly colTypeMap: Record<string, string> = {
    requestNumber: 'text', referencia: 'text', title: 'text',
    requesterName: 'text', requesterDepartment: 'text', totalAmount: 'numeric',
    approverName: 'text', compradorName: 'text', ordenMantenimiento: 'text', codigoInversion: 'text',
    priority: 'enum', status: 'enum', createdAt: 'date',
  };

  tdClass(key: string): string {
    const map: Record<string, string> = {
      requestNumber: 'text-mono', totalAmount: 'text-mono', ordenMantenimiento: 'text-mono',
      title: 'text-primary', referencia: 'text-muted',
      requesterName: 'text-muted', requesterDepartment: 'text-muted',
      approverName: 'text-muted', compradorName: 'text-muted', createdAt: 'text-muted',
      codigoInversion: 'text-muted',
    };
    return map[key] ?? '';
  }

  inversionLabel(req: PurchaseRequest): string {
    if (!req.codigoInversion) return '—';
    const inv = this.inversionesSvc.inversiones().find(i => i.codigo === req.codigoInversion);
    return inv ? `${inv.codigo} — ${inv.descripcion}` : req.codigoInversion;
  }

  private saveCols(): void {
    localStorage.setItem(COL_KEY, JSON.stringify(
      this.cols().map(c => ({ key: c.key, visible: c.visible, width: c.width }))
    ));
  }

  toggleCol(key: string): void {
    this.cols.update(cs => cs.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
    this.saveCols();
  }

  resetCols(): void {
    this.cols.set(DEFAULT_COLS.map(c => ({ ...c })));
    localStorage.removeItem(COL_KEY);
  }

  // ── Column resize ─────────────────────────────────────────────────────────

  private _resizingKey = '';
  private _resizeX0    = 0;
  private _resizeW0    = 0;

  private _resizeMove = (e: MouseEvent) => {
    if (!this._resizingKey) return;
    const w = Math.max(50, this._resizeW0 + (e.clientX - this._resizeX0));
    this.cols.update(cs => cs.map(c => c.key === this._resizingKey ? { ...c, width: w } : c));
  };

  private _resizeUp = () => {
    document.removeEventListener('mousemove', this._resizeMove);
    document.removeEventListener('mouseup',   this._resizeUp);
    if (this._resizingKey) this.saveCols();
    this._resizingKey = '';
  };

  startResize(e: MouseEvent, col: ColDef): void {
    e.preventDefault();
    e.stopPropagation();
    this._resizingKey = col.key;
    this._resizeX0    = e.clientX;
    this._resizeW0    = col.width;
    document.addEventListener('mousemove', this._resizeMove);
    document.addEventListener('mouseup',   this._resizeUp);
  }

  // ── Column drag-reorder ───────────────────────────────────────────────────

  private _dragKey = '';

  onDragStart(e: DragEvent, col: ColDef): void {
    this._dragKey = col.key;
    e.dataTransfer?.setData('text/plain', col.key);
  }

  onDragOver(e: DragEvent, col: ColDef): void {
    e.preventDefault();
    this.dragOverKey.set(col.key);
  }

  onDragLeave(): void { this.dragOverKey.set(null); }

  onDrop(e: DragEvent, target: ColDef): void {
    e.preventDefault();
    this.dragOverKey.set(null);
    if (!this._dragKey || this._dragKey === target.key) return;
    this.cols.update(cs => {
      const arr = [...cs];
      const fi = arr.findIndex(c => c.key === this._dragKey);
      const ti = arr.findIndex(c => c.key === target.key);
      const [moved] = arr.splice(fi, 1);
      arr.splice(ti, 0, moved);
      return arr;
    });
    this._dragKey = '';
    this.saveCols();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.showColMenu() && !(e.target as Element).closest?.('.col-menu-wrapper')) {
      this.showColMenu.set(false);
    }
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  toggleAll(): void {
    const page = this.paginatedRequests();
    if (this.allPageSelected()) {
      this.selectedIds.update(s => { const n = new Set(s); page.forEach(r => n.delete(r.id)); return n; });
    } else {
      this.selectedIds.update(s => { const n = new Set(s); page.forEach(r => n.add(r.id)); return n; });
    }
  }

  toggleRow(id: string): void {
    this.selectedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

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
    effect(() => { this.filter(); this.page.set(1); this.selectedIds.set(new Set()); });
  }

  onPageSizeChange(n: number): void { this.pageSize.set(n); this.page.set(1); }

  ngOnInit(): void {
    this.prService.loadSolicitudes();
    this.inversionesSvc.load();
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this._resizeMove);
    document.removeEventListener('mouseup',   this._resizeUp);
  }

  openTab(req: PurchaseRequest): void {
    if (!this.openTabs().some(t => t.id === req.id)) {
      this.openTabs.update(tabs => [...tabs, { id: req.id, label: req.requestNumber, type: 'detail' }]);
    }
    this.activeTab.set(req.id);
  }

  private _createCount = 0;

  openCreateTab(): void {
    const id = `new-${++this._createCount}`;
    this.openTabs.update(tabs => [...tabs, { id, label: 'Nueva solicitud', type: 'create' }]);
    this.activeTab.set(id);
  }

  onCreateSaved(tabId: string, solicitudId: string): void {
    const tabs = this.openTabs().map(t =>
      t.id === tabId ? { id: solicitudId, label: '...', type: 'detail' as const } : t
    );
    this.openTabs.set(tabs);
    this.activeTab.set(solicitudId);
    // Actualiza el label con el número real una vez cargado el registro
    const req = this.prService.requests().find(r => r.id === solicitudId);
    if (req) {
      this.openTabs.update(ts => ts.map(t => t.id === solicitudId ? { ...t, label: req.requestNumber } : t));
    }
  }

  onCreateCancelled(tabId: string): void {
    this.closeTab(new Event('cancel'), tabId);
  }

  closeTab(event: Event, id: string): void {
    event.stopPropagation();
    const remaining = this.openTabs().filter(t => t.id !== id);
    this.openTabs.set(remaining);
    if (this.activeTab() === id) {
      this.activeTab.set(remaining.length > 0 ? remaining[remaining.length - 1].id : 'list');
    }
  }

  deleting = signal(false);

  deleteSelected(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    const label = ids.length === 1 ? '1 solicitud' : `${ids.length} solicitudes`;
    if (!confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return;
    this.deleting.set(true);
    forkJoin(ids.map(id => this.prService.delete(id))).subscribe({
      next: () => { this.selectedIds.set(new Set()); this.deleting.set(false); },
      error: err => {
        alert(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.deleting.set(false);
      },
    });
  }

  updateSearch(value: string):   void { this.filter.update(f => ({ ...f, search: value })); }
  updateStatus(value: string):   void { this.filter.update(f => ({ ...f, status: value as RequestStatus | 'all' })); }
  updatePriority(value: string): void { this.filter.update(f => ({ ...f, priority: value as RequestPriority | 'all' })); }
  clearFilters(): void { this.filter.set({ status: 'all', priority: 'all', search: '' }); }
}
