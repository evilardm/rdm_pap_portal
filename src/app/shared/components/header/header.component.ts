import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">{{ title }}</h1>
        <p *ngIf="subtitle" class="page-subtitle">{{ subtitle }}</p>
      </div>
      <div class="header-right">
        <ng-content></ng-content>
      </div>
    </header>
  `,
  styles: [`
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .header-left { display: flex; flex-direction: column; gap: 4px; }
    .page-title {
      font-size: 22px;
      font-weight: 600;
      color: #111827;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .page-subtitle {
      font-size: 13px;
      color: #6b7280;
      margin: 0;
    }
    .header-right { display: flex; align-items: center; gap: 10px; }
  `]
})
export class HeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
