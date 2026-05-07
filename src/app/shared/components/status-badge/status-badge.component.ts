import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestStatus, RequestPriority } from '../../../core/models/purchase-request.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [ngClass]="badgeClass">
      <span class="dot"></span>
      {{ label }}
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.02em;
      border: 1px solid transparent;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
    .badge-pending  { background: #fef9c3; color: #a16207; border-color: #fde047; }
    .badge-approved { background: #dcfce7; color: #15803d; border-color: #86efac; }
    .badge-rejected { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; }
    .badge-draft    { background: #f3f4f6; color: #4b5563; border-color: #d1d5db; }
    .badge-low      { background: #ede9fe; color: #6d28d9; border-color: #c4b5fd; }
    .badge-medium   { background: #fef9c3; color: #a16207; border-color: #fde047; }
    .badge-high     { background: #ffedd5; color: #c2410c; border-color: #fdba74; }
    .badge-urgent   { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; }
  `]
})
export class StatusBadgeComponent {
  @Input() status?: RequestStatus;
  @Input() priority?: RequestPriority;

  get badgeClass(): string {
    if (this.status) return `badge-${this.status}`;
    if (this.priority) return `badge-${this.priority}`;
    return '';
  }

  get label(): string {
    const statusLabels: Record<RequestStatus, string> = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      draft: 'Borrador',
    };
    const priorityLabels: Record<RequestPriority, string> = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      urgent: 'Urgente',
    };
    if (this.status) return statusLabels[this.status];
    if (this.priority) return priorityLabels[this.priority];
    return '';
  }
}
