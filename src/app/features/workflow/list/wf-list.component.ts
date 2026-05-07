import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
  svc = inject(WorkflowService);

  search   = signal('');
  deleting = signal<string | null>(null);

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
