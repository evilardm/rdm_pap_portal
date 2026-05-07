import { Component } from '@angular/core';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [HeaderComponent],
  template: `
    <app-header title="Ventas" subtitle="Gestión de pedidos de venta" />
    <div class="empty-module">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.66a2 2 0 001.99-1.74l1.38-9.26H6"/>
      </svg>
      <p>El módulo de ventas está en construcción.</p>
      <span>Próximamente podrás gestionar pedidos de venta desde aquí.</span>
    </div>
  `,
  styles: [`
    :host { display: block; padding: 28px 32px; }
    .empty-module {
      display: flex; flex-direction: column; align-items: center;
      gap: 10px; padding: 60px 20px; color: #9ca3af; text-align: center;
      svg { color: #d1d5db; }
      p { font-size: 15px; color: #374151; font-weight: 500; margin: 0; }
      span { font-size: 13px; }
    }
  `],
})
export class VentasComponent {}
