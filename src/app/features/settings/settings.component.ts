import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  auth    = inject(AuthService);
  session = inject(SessionService);

  get modulos() {
    return this.session.session()?.modulos ?? [];
  }

  labelPermiso(m: { puedeLeer: boolean; puedeEscribir: boolean; puedeAprobar: boolean }): string {
    const p: string[] = [];
    if (m.puedeLeer)    p.push('Lectura');
    if (m.puedeEscribir) p.push('Escritura');
    if (m.puedeAprobar) p.push('Aprobación');
    return p.length ? p.join(' · ') : 'Sin permisos';
  }
}
