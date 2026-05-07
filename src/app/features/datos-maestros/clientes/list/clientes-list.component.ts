import { Component, inject, signal, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DatosMaestrosService } from '../../../../core/services/datos-maestros.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { PaginatorComponent } from '../../../../shared/components/paginator/paginator.component';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, PaginatorComponent],
  templateUrl: './clientes-list.component.html',
  styleUrl: './clientes-list.component.scss',
})
export class ClientesListComponent {
  private svc = inject(DatosMaestrosService);

  search   = signal('');
  page     = signal(1);
  pageSize = signal(20);

  filtered = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.svc.clientes();
    return this.svc.clientes().filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      c.nif.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.telefono.includes(q)
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

  onDelete(id: string): void {
    if (confirm('¿Eliminar este cliente?')) {
      this.svc.deleteCliente(id);
    }
  }
}
