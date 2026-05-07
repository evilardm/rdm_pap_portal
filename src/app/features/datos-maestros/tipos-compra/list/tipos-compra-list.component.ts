import { Component, inject, signal, computed, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TiposDocumentoService } from '../../../../core/services/tipos-compra.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { PaginatorComponent } from '../../../../shared/components/paginator/paginator.component';

@Component({
  selector: 'app-tipos-documento-list',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, PaginatorComponent],
  templateUrl: './tipos-compra-list.component.html',
  styleUrl: './tipos-compra-list.component.scss',
})
export class TiposDocumentoListComponent implements OnInit {
  svc = inject(TiposDocumentoService);

  search     = signal('');
  page       = signal(1);
  pageSize   = signal(20);
  deletingId = signal<string | null>(null);

  filtered = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.svc.tiposDocumento();
    return this.svc.tiposDocumento().filter(t =>
      t.nombre.toLowerCase().includes(q) ||
      t.codigo.toLowerCase().includes(q) ||
      t.modulo.toLowerCase().includes(q) ||
      (t.descripcion ?? '').toLowerCase().includes(q)
    );
  });

  currentPage = computed(() =>
    Math.min(this.page(), Math.max(1, Math.ceil(this.filtered().length / this.pageSize())))
  );

  paginated = computed(() => {
    const p = this.currentPage(), s = this.pageSize();
    return this.filtered().slice((p - 1) * s, p * s);
  });

  constructor() {
    effect(() => { this.search(); this.page.set(1); }, { allowSignalWrites: true });
  }

  ngOnInit(): void { this.svc.load(true); }

  onPageSizeChange(n: number): void { this.pageSize.set(n); this.page.set(1); }

  confirmDelete(id: string): void { this.deletingId.set(id); }
  cancelDelete(): void { this.deletingId.set(null); }

  doDelete(id: string): void {
    this.svc.delete(id).subscribe({
      next:  () => this.deletingId.set(null),
      error: () => this.deletingId.set(null),
    });
  }
}
