import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { ApiUsuario } from '../../../core/models/api-usuario.model';
import { UserFormComponent } from '../form/user-form.component';

interface Tab { id: string; label: string; }

const MODULE_LABELS: Record<string, string> = {
  COMPRAS: 'Compras', MASTER_DATA: 'Maestros', VENTAS: 'Ventas', PRODUCCION: 'Producción',
};

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, UserFormComponent],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent implements OnInit {
  svc = inject(UsuariosService);

  search    = signal('');
  deleting  = signal<string | null>(null);
  deleteErr = signal('');

  activeTab = signal<string>('list');
  openTabs  = signal<Tab[]>([]);

  filtered = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.svc.usuarios();
    return this.svc.usuarios().filter(u =>
      u.nombre.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.departamento ?? '').toLowerCase().includes(q)
    );
  });

  ngOnInit(): void { this.svc.load(); }

  activeModules(u: ApiUsuario): string[] {
    return u.permisos
      .filter(p => p.puedeLeer || p.puedeEscribir || p.puedeAprobar || p.esAdminModulo)
      .map(p => MODULE_LABELS[p.modulo] ?? p.modulo);
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────────

  openTab(u: ApiUsuario): void {
    if (!this.openTabs().some(t => t.id === u.id)) {
      this.openTabs.update(tabs => [...tabs, { id: u.id, label: u.nombre }]);
    }
    this.activeTab.set(u.id);
  }

  openNewTab(): void {
    if (!this.openTabs().some(t => t.id === 'nuevo')) {
      this.openTabs.update(tabs => [...tabs, { id: 'nuevo', label: 'Nuevo usuario' }]);
    }
    this.activeTab.set('nuevo');
  }

  closeTab(event: Event, id: string): void {
    event.stopPropagation();
    const remaining = this.openTabs().filter(t => t.id !== id);
    this.openTabs.set(remaining);
    if (this.activeTab() === id) {
      this.activeTab.set(remaining.length > 0 ? remaining[remaining.length - 1].id : 'list');
    }
  }

  onFormSaved(): void {
    const id = this.activeTab();
    this.svc.load();
    const remaining = this.openTabs().filter(t => t.id !== id);
    this.openTabs.set(remaining);
    this.activeTab.set(remaining.length > 0 ? remaining[remaining.length - 1].id : 'list');
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  confirmDelete(u: ApiUsuario): void {
    if (!confirm(`¿Eliminar usuario "${u.nombre}"?\nEsta acción no se puede deshacer.`)) return;
    this.deleting.set(u.id);
    this.deleteErr.set('');
    this.svc.remove(u.id).subscribe({
      next: () => {
        this.deleting.set(null);
        // Close the tab if it was open
        if (this.openTabs().some(t => t.id === u.id)) {
          const remaining = this.openTabs().filter(t => t.id !== u.id);
          this.openTabs.set(remaining);
          if (this.activeTab() === u.id) {
            this.activeTab.set(remaining.length > 0 ? remaining[remaining.length - 1].id : 'list');
          }
        }
      },
      error: err => {
        this.deleteErr.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.deleting.set(null);
      },
    });
  }
}
