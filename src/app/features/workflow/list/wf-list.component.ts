import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { WorkflowService } from '../../../core/services/workflow.service';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { WfFlujo } from '../../../core/models/workflow.model';

@Component({
  selector: 'app-wf-list',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  templateUrl: './wf-list.component.html',
  styleUrl: './wf-list.component.scss',
})
export class WfListComponent implements OnInit {
  private router = inject(Router);
  svc = inject(WorkflowService);

  search      = signal('');
  deleting    = signal<string | null>(null);
  duplicating = signal<string | null>(null);

  filtered = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.svc.flujos();
    return this.svc.flujos().filter(f =>
      f.nombre.toLowerCase().includes(q) ||
      f.modulo.toLowerCase().includes(q) ||
      f.documento.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.svc.loadFlujos();
  }

  onDuplicate(e: Event, flujo: WfFlujo): void {
    e.stopPropagation();
    if (!flujo.id) return;
    this.duplicating.set(flujo.id);
    this.svc.duplicateFlujo(flujo.id).subscribe({
      next: copy => {
        this.duplicating.set(null);
        this.router.navigate(['/workflow', copy.id]);
      },
      error: () => this.duplicating.set(null),
    });
  }

  onDelete(e: Event, flujo: WfFlujo): void {
    e.stopPropagation();
    if (!flujo.id) return;
    if (!confirm(`¿Eliminar el flujo "${flujo.nombre}"? Esta acción no se puede deshacer.`)) return;
    this.deleting.set(flujo.id);
    this.svc.deleteFlujo(flujo.id).subscribe({
      next: () => this.deleting.set(null),
      error: () => this.deleting.set(null),
    });
  }
}
