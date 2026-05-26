import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InversionesService } from '../../../../core/services/inversiones.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { PaginatorComponent } from '../../../../shared/components/paginator/paginator.component';

@Component({
  selector: 'app-inversiones-list',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, PaginatorComponent],
  templateUrl: './inversiones-list.component.html',
  styleUrl: './inversiones-list.component.scss',
})
export class InversionesListComponent {
  svc = inject(InversionesService);

  search       = signal('');
  filtroEstado = signal<'todas' | 'abiertas' | 'cerradas'>('abiertas');
  page         = signal(1);
  pageSize     = signal(20);

  filtered = computed(() => {
    const q      = this.search().toLowerCase();
    const filtro = this.filtroEstado();
    let items = this.svc.inversiones();
    if (filtro === 'abiertas')  items = items.filter(i => !i.cerrada);
    if (filtro === 'cerradas')  items = items.filter(i =>  i.cerrada);
    if (!q) return items;
    return items.filter(i =>
      i.codigo.toLowerCase().includes(q) ||
      i.descripcion.toLowerCase().includes(q)
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
    this.svc.load();
    effect(() => { this.search(); this.filtroEstado(); this.page.set(1); }, { allowSignalWrites: true });
  }

  onPageSizeChange(n: number): void { this.pageSize.set(n); this.page.set(1); }
}
