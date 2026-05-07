import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="paginator">
      <div class="pag-nav">
        <button class="pag-btn" [disabled]="page() <= 1" (click)="prev()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span class="pag-label">Página</span>
        <input class="pag-input" type="number" min="1" [max]="totalPages()"
          [value]="page()" (change)="goTo(+$any($event.target).value)"
          (keydown.enter)="goTo(+$any($event.target).value)" />
        <span class="pag-label">de {{ totalPages() }}</span>
        <button class="pag-btn" [disabled]="page() >= totalPages()" (click)="next()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
      <div class="pag-right">
        <select class="pag-size" [value]="pageSize()" (change)="sizeChange(+$any($event.target).value)">
          @for (opt of sizeOptions; track opt) {
            <option [value]="opt">{{ opt }} filas</option>
          }
        </select>
        <span class="pag-count">{{ totalItems() }} registros</span>
      </div>
    </div>
  `,
  styles: [`
    .paginator {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 14px; border-top: 1px solid #e5e7eb;
      background: #ffffff; flex-shrink: 0;
    }
    .pag-nav { display: flex; align-items: center; gap: 6px; }
    .pag-right { display: flex; align-items: center; gap: 10px; }
    .pag-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border: 1px solid #e5e7eb; border-radius: 5px;
      background: #ffffff; color: #374151; cursor: pointer; transition: all 0.15s;
      padding: 0;
      &:hover:not(:disabled) { background: #f3f4f6; border-color: #d1d5db; }
      &:disabled { color: #d1d5db; cursor: default; }
    }
    .pag-label { font-size: 12px; color: #6b7280; }
    .pag-input {
      width: 44px; height: 26px; text-align: center;
      border: 1px solid #e5e7eb; border-radius: 5px; font-size: 12px;
      color: #111827; background: #f9fafb; outline: none;
      &:focus { border-color: #3ecf8e; background: #ffffff; }
    }
    .pag-size {
      height: 26px; border: 1px solid #e5e7eb; border-radius: 5px;
      font-size: 12px; color: #374151; background: #f9fafb;
      padding: 0 6px; outline: none; cursor: pointer;
      &:focus { border-color: #3ecf8e; }
    }
    .pag-count { font-size: 12px; color: #9ca3af; }
  `],
})
export class PaginatorComponent {
  totalItems = input<number>(0);
  pageSize   = input<number>(20);
  page       = input<number>(1);

  pageChange     = output<number>();
  pageSizeChange = output<number>();

  readonly sizeOptions = [10, 20, 50, 100];

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));

  prev(): void { if (this.page() > 1) this.pageChange.emit(this.page() - 1); }
  next(): void { if (this.page() < this.totalPages()) this.pageChange.emit(this.page() + 1); }

  goTo(n: number): void {
    const clamped = Math.max(1, Math.min(Math.round(n), this.totalPages()));
    if (clamped !== this.page()) this.pageChange.emit(clamped);
  }

  sizeChange(n: number): void { this.pageSizeChange.emit(n); }
}
