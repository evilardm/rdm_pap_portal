import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PurchaseRequestService } from '../../core/services/purchase-request.service';
import { AuthService } from '../../core/services/auth.service';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { PurchaseRequest } from '../../core/models/purchase-request.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, StatusBadgeComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  prService = inject(PurchaseRequestService);
  auth      = inject(AuthService);

  /** Solicitudes aprobadas/rechazadas por este aprobador (cargadas aparte) */
  private aprobadorItems = signal<PurchaseRequest[]>([]);

  /**
   * Para aprobadores: combina las propias con las que han aprobado/rechazado,
   * deduplicando por id. Para el resto usa solo las propias.
   */
  private allItems = computed(() => {
    const own = this.prService.requests();
    const extra = this.aprobadorItems();
    if (!extra.length) return own;
    const ids = new Set(own.map(r => r.id));
    return [...own, ...extra.filter(r => !ids.has(r.id))];
  });

  stats = computed(() => {
    const all = this.allItems();
    return {
      total:       all.length,
      pending:     all.filter(r => r.status === 'pending').length,
      approved:    all.filter(r => r.status === 'approved').length,
      rejected:    all.filter(r => r.status === 'rejected').length,
      draft:       all.filter(r => r.status === 'draft').length,
      totalAmount: all.reduce((s, r) => s + r.totalAmount, 0),
    };
  });

  recentRequests = computed(() =>
    [...this.allItems()]
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      .slice(0, 5)
  );

  ngOnInit(): void {
    this.prService.loadSolicitudes();

    const userId = this.auth.myUserId();
    if (userId && this.auth.isApprover()) {
      this.prService.getSolicitudesAprobador(userId).subscribe({
        next: list => this.aprobadorItems.set(list),
        error: ()  => { /* si falla, se muestran solo las propias */ },
      });
    }
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }
}
