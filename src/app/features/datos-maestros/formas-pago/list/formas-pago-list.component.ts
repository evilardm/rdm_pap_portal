import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormasPagoService } from '../../../../core/services/formas-pago.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { PaginatorComponent } from '../../../../shared/components/paginator/paginator.component';

@Component({
  selector: 'app-formas-pago-list',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, PaginatorComponent],
  templateUrl: './formas-pago-list.component.html',
  styleUrl: './formas-pago-list.component.scss',
})
export class FormasPagoListComponent {
  svc = inject(FormasPagoService);

  search   = signal('');
  page     = signal(1);
  pageSize = signal(20);

  filtered = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.svc.formasPago();
    return this.svc.formasPago().filter(fp =>
      fp.nombre.toLowerCase().includes(q) ||
      (fp.codigo ?? '').toLowerCase().includes(q)
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
    effect(() => { this.search(); this.page.set(1); }, { allowSignalWrites: true });
  }

  onPageSizeChange(n: number): void { this.pageSize.set(n); this.page.set(1); }
}
