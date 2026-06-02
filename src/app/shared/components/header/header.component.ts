import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="page-header" [class.actions-left]="actionsLeft">
      <div class="header-actions">
        <ng-content></ng-content>
      </div>
      <div class="header-titles">
        <h1 class="page-title">{{ title }}</h1>
        <p *ngIf="subtitle" class="page-subtitle">{{ subtitle }}</p>
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
    .header-titles { display: flex; flex-direction: column; gap: 4px; }
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
    .header-actions { display: flex; align-items: center; gap: 10px; }

    /* Default: actions right, title left */
    .page-header:not(.actions-left) { flex-direction: row-reverse; }

    /* actionsLeft: actions left, title right — titles align right */
    .page-header.actions-left .header-titles { text-align: right; }
  `]
})
export class HeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() actionsLeft = false;
}
