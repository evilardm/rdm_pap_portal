import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatosMaestrosService } from '../../../../core/services/datos-maestros.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { PaginatorComponent } from '../../../../shared/components/paginator/paginator.component';

@Component({
  selector: 'app-productos-list',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, PaginatorComponent],
  templateUrl: './productos-list.component.html',
  styleUrl: './productos-list.component.scss',
})
export class ProductosListComponent {
  svc = inject(DatosMaestrosService);

  search   = signal('');
  page     = signal(1);
  pageSize = signal(20);

  filtered = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.svc.productos();
    return this.svc.productos().filter(p =>
      p.id.toLowerCase().includes(q) ||
      p.nombre.toLowerCase().includes(q) ||
      p.familia.toLowerCase().includes(q)
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

  onPageSizeChange(n: number): void { this.pageSize.set(n); this.page.set(1); }

  familiaNombre(codigo: string): string {
    return this.svc.getCategoriaById(codigo)?.nombre ?? (codigo || '—');
  }
}
