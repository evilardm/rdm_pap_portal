import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatosMaestrosService } from '../../../../core/services/datos-maestros.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { PaginatorComponent } from '../../../../shared/components/paginator/paginator.component';

@Component({
  selector: 'app-proveedores-list',
  standalone: true,
  imports: [CommonModule, HeaderComponent, PaginatorComponent],
  templateUrl: './proveedores-list.component.html',
  styleUrl: './proveedores-list.component.scss',
})
export class ProveedoresListComponent {
  svc = inject(DatosMaestrosService);

  search   = signal('');
  page     = signal(1);
  pageSize = signal(20);

  filtered = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.svc.proveedores();
    return this.svc.proveedores().filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.cif.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
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
}
