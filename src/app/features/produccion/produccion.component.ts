import { Component } from '@angular/core';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-produccion',
  standalone: true,
  imports: [HeaderComponent],
  template: `
    <app-header title="Producción" subtitle="Gestión de órdenes de producción" />
    <div class="empty-module">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 3l-4 4-4-4"/><line x1="12" y1="12" x2="12" y2="17"/>
        <line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/>
      </svg>
      <p>El módulo de producción está en construcción.</p>
      <span>Próximamente podrás gestionar órdenes de producción desde aquí.</span>
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
export class ProduccionComponent {}
