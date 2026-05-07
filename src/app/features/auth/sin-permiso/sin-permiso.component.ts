import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sin-permiso',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="sp-wrap">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
      <h2>Sin permiso</h2>
      <p>No tienes acceso a esta sección. Contacta con tu administrador.</p>
      <a routerLink="/dashboard" class="sp-btn">Volver al inicio</a>
    </div>
  `,
  styles: [`
    .sp-wrap {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 12px; min-height: 60vh;
      text-align: center; padding: 40px;
    }
    h2 { font-size: 20px; font-weight: 600; color: #111827; margin: 0; }
    p  { font-size: 14px; color: #6b7280; margin: 0; max-width: 340px; }
    .sp-btn {
      margin-top: 8px; padding: 9px 20px; background: #3ecf8e;
      color: #fff; border-radius: 7px; font-size: 13px;
      font-weight: 500; text-decoration: none;
      &:hover { background: #2dbe7e; }
    }
  `],
})
export class SinPermisoComponent {}
