import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PurchaseRequestService } from '../../../core/services/purchase-request.service';
import { AuthService } from '../../../core/services/auth.service';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { PurchaseRequest } from '../../../core/models/purchase-request.model';

@Component({
  selector: 'app-aprobaciones-historico',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, StatusBadgeComponent],
  templateUrl: './aprobaciones-historico.component.html',
  styleUrl: './aprobaciones-historico.component.scss',
})
export class AprobacionesHistoricoComponent implements OnInit {
  private prService = inject(PurchaseRequestService);
  private auth      = inject(AuthService);

  items   = signal<PurchaseRequest[]>([]);
  loading = signal(true);
  error   = signal('');

  ngOnInit(): void { this.load(); }

  load(): void {
    const userId = this.auth.myUserId();
    if (!userId) { this.loading.set(false); return; }

    this.loading.set(true);
    this.error.set('');
    this.prService.getSolicitudesAprobador(userId).subscribe({
      next: list => { this.items.set(list); this.loading.set(false); },
      error: err => {
        this.error.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.loading.set(false);
      },
    });
  }
}
