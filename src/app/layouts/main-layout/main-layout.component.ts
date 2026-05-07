import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { MODULE_DEFINITIONS } from '../../core/models/permissions.model';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SidebarComponent],
  template: `
    <div class="app-layout" (click)="onLayoutClick()">

      <!-- Left nav -->
      <nav class="left-nav" [class.collapsed]="navCollapsed()">
        <div class="left-nav-header">
          <div class="app-logo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
          <span class="app-name">PAP</span>
        </div>

        <div class="left-nav-body">
          <!-- Dashboard -->
          <a routerLink="/dashboard" routerLinkActive="lnav-active"
             [routerLinkActiveOptions]="{exact:true}" class="lnav-item"
             [title]="navCollapsed() ? 'Dashboard' : ''">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span class="lnav-label">Dashboard</span>
          </a>

          <!-- Separator -->
          @if (navModules().length > 0) {
            <div class="lnav-separator"></div>
          }

          <!-- Dynamic modules -->
          @for (mod of navModules(); track mod.id) {
            <a [routerLink]="mod.baseRoute" routerLinkActive="lnav-active"
               [routerLinkActiveOptions]="{exact:false}" class="lnav-item"
               [title]="navCollapsed() ? mod.label : ''">
              @if (mod.id === 'compras') {
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              }
              @if (mod.id === 'ventas') {
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.66a2 2 0 001.99-1.74L21 4H6"/>
                </svg>
              }
              @if (mod.id === 'produccion') {
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M2 20h20M4 20V10l8-6 8 6v10"/><rect x="9" y="14" width="6" height="6"/>
                </svg>
              }
              @if (mod.id === 'maestros') {
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/>
                  <path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/>
                  <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
                </svg>
              }
              @if (mod.id === 'usuarios') {
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              }
              @if (mod.id === 'configuracion') {
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
              }
              <span class="lnav-label">{{ mod.label }}</span>
            </a>
          }
        </div>

        <div class="left-nav-footer">
          <!-- Collapse toggle -->
          <button class="lnav-collapse-btn" (click)="toggleNav()"
                  [title]="navCollapsed() ? 'Expandir menú' : 'Contraer menú'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 [style.transform]="navCollapsed() ? 'rotate(180deg)' : 'rotate(0)'">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span class="lnav-label">Contraer</span>
          </button>
        </div>
      </nav>

      <!-- Sub-items panel (module sidebar) -->
      @if (showSidebar()) {
        <app-sidebar />
      }

      <!-- Main area -->
      <div class="main-wrapper">
        <header class="topbar">
          <div class="topbar-left">
            @if (sectionLabel()) {
              <span class="topbar-section">{{ sectionLabel() }}</span>
            }
          </div>
          <div class="topbar-right">
            <div class="user-dropdown-container">
              <button class="user-btn" (click)="toggleDropdown(); $event.stopPropagation()">
                <div class="user-avatar-sm">{{ auth.currentUser()?.name?.charAt(0) }}</div>
                <span class="user-email">{{ auth.currentUser()?.email }}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                     [style.transform]="dropdownOpen() ? 'rotate(180deg)' : 'rotate(0)'">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              @if (dropdownOpen()) {
              <div class="user-menu" (click)="$event.stopPropagation()">
                <div class="user-menu-header">
                  <div class="user-menu-avatar">{{ auth.currentUser()?.name?.charAt(0) }}</div>
                  <div class="user-menu-info">
                    <span class="user-menu-name">{{ auth.currentUser()?.name }}</span>
                    <span class="user-menu-email">{{ auth.currentUser()?.email }}</span>
                  </div>
                  @if (auth.isAdmin()) {
                    <span class="user-role-badge">Admin</span>
                  }
                </div>

                <div class="menu-divider"></div>

                <div class="user-menu-perms">
                  <p class="perms-label">Mis permisos</p>
                  @if (auth.isAdmin()) {
                    <p class="perms-admin-note">Acceso completo a todos los módulos.</p>
                  } @else if (modulos().length > 0) {
                    @for (m of modulos(); track m.modulo) {
                      <div class="perms-row">
                        <span class="perms-module">{{ m.modulo }}</span>
                        <span class="perms-tags">
                          @if (m.puedeLeer)    { <span class="ptag ptag-read">Lect.</span> }
                          @if (m.puedeEscribir){ <span class="ptag ptag-write">Escr.</span> }
                          @if (m.puedeAprobar) { <span class="ptag ptag-approve">Apro.</span> }
                        </span>
                      </div>
                    }
                  } @else {
                    <p class="perms-empty">Sin módulos asignados.</p>
                  }
                </div>

                <div class="menu-divider"></div>

                <a routerLink="/preferencias" class="menu-item" (click)="dropdownOpen.set(false)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Preferencias
                </a>
                <div class="menu-divider"></div>

                <button class="menu-item menu-item-danger" (click)="auth.logout()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Cerrar sesión
                </button>
              </div>
              }
            </div>
          </div>
        </header>

        <main class="main-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      min-height: 100vh;
      background: #ffffff;
    }

    /* ── Left nav ── */
    .left-nav {
      width: 176px;
      height: 100vh;
      background: #ffffff;
      border-right: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      transition: width 0.2s ease;
      overflow: hidden;
    }
    .left-nav.collapsed { width: 48px; }
    .left-nav.collapsed .app-name { display: none; }
    .left-nav.collapsed .left-nav-header { justify-content: center; padding: 14px 0 12px; }
    .left-nav.collapsed .lnav-item { justify-content: center; padding: 7px 0; gap: 0; }
    .left-nav.collapsed .lnav-label { display: none; }
    .left-nav.collapsed .lnav-collapse-btn { justify-content: center; padding: 7px 0; gap: 0; }
    .left-nav.collapsed .lnav-collapse-btn .lnav-label { display: none; }
    .left-nav.collapsed .lnav-separator { margin: 4px 8px; }
    .lnav-label { transition: opacity 0.15s; }

    .lnav-separator {
      height: 1px;
      background: #f3f4f6;
      margin: 4px 10px;
    }

    .lnav-collapse-btn {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 7px 10px;
      border-radius: 5px;
      font-size: 13px;
      color: #9ca3af;
      background: none;
      border: none;
      cursor: pointer;
      width: 100%;
      margin-top: 2px;
      transition: background 0.12s, color 0.12s;
      svg { flex-shrink: 0; transition: transform 0.2s, color 0.12s; }
    }
    .lnav-collapse-btn:hover { background: #f9fafb; color: #374151; }

    .left-nav-header {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 14px 14px 12px;
      border-bottom: 1px solid #f3f4f6;
    }
    .app-logo {
      width: 28px; height: 28px;
      background: #1a1a1a; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      color: #ffffff; flex-shrink: 0;
    }
    .app-name { font-size: 13px; font-weight: 600; color: #111827; letter-spacing: 0.02em; }

    .left-nav-body {
      flex: 1;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 1px;
      overflow-y: auto;
    }
    .left-nav-footer {
      padding: 8px 8px 12px;
      border-top: 1px solid #f3f4f6;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .lnav-item {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 7px 10px;
      border-radius: 5px;
      font-size: 13px;
      font-weight: 400;
      color: #374151;
      text-decoration: none;
      transition: background 0.12s, color 0.12s;
      cursor: pointer;
      width: 100%;
      svg { color: #6b7280; flex-shrink: 0; transition: color 0.12s; }
    }
    .lnav-item:hover { background: #f9fafb; color: #111827; svg { color: #374151; } }
    .lnav-item.lnav-active {
      color: #111827; font-weight: 500; background: #f3f4f6;
      svg { color: #111827; }
    }

    /* ── Main wrapper ── */
    .main-wrapper { flex: 1; display: flex; flex-direction: column; min-width: 0; }

    /* ── Topbar ── */
    .topbar {
      height: 44px;
      border-bottom: 1px solid #e5e7eb;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .topbar-left { display: flex; align-items: center; gap: 8px; }
    .topbar-section { font-size: 13px; font-weight: 500; color: #374151; }
    .topbar-right { display: flex; align-items: center; gap: 10px; }

    /* ── User dropdown ── */
    .user-dropdown-container { position: relative; }
    .user-btn {
      display: flex; align-items: center; gap: 7px;
      background: none; border: 1px solid #e5e7eb; border-radius: 6px;
      padding: 5px 10px 5px 6px; cursor: pointer; font-size: 12.5px; color: #374151;
      transition: all 0.15s;
      svg { transition: transform 0.2s; color: #9ca3af; }
    }
    .user-btn:hover { background: #f9fafb; border-color: #d1d5db; }
    .user-avatar-sm {
      width: 22px; height: 22px; background: #f3f4f6; border: 1px solid #e5e7eb;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 600; color: #374151; flex-shrink: 0;
    }
    .user-email { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .user-menu {
      position: absolute; top: calc(100% + 6px); right: 0; width: 280px;
      background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06);
      overflow: hidden; z-index: 100;
    }
    .user-menu-header { display: flex; align-items: center; gap: 10px; padding: 14px 14px 12px; }
    .user-menu-avatar {
      width: 32px; height: 32px; background: #f3f4f6; border: 1px solid #e5e7eb;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 600; color: #374151; flex-shrink: 0;
    }
    .user-menu-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .user-menu-name { font-size: 13px; font-weight: 500; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-menu-email { font-size: 11.5px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-role-badge {
      font-size: 10.5px; font-weight: 600; color: #059669;
      background: #ecfdf5; padding: 2px 7px; border-radius: 4px;
      white-space: nowrap; flex-shrink: 0;
    }
    .menu-divider { height: 1px; background: #f3f4f6; }
    .user-menu-perms {
      padding: 10px 14px; display: flex; flex-direction: column; gap: 5px;
      max-height: 180px; overflow-y: auto;
    }
    .perms-label { font-size: 10.5px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 3px; }
    .perms-admin-note, .perms-empty { font-size: 12px; color: #6b7280; margin: 0; }
    .perms-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .perms-module { font-size: 12px; font-weight: 500; color: #374151; }
    .perms-tags { display: flex; gap: 3px; flex-wrap: wrap; justify-content: flex-end; }
    .ptag { font-size: 10px; padding: 1px 5px; border-radius: 3px; font-weight: 500; }
    .ptag-read    { background: #eff6ff; color: #3b82f6; }
    .ptag-write   { background: #fef3c7; color: #d97706; }
    .ptag-approve { background: #f0fdf4; color: #16a34a; }
    .menu-item {
      display: flex; align-items: center; gap: 9px; width: 100%;
      padding: 9px 14px; font-size: 13px; color: #374151;
      background: none; border: none; cursor: pointer; text-align: left;
      text-decoration: none; transition: background 0.1s;
    }
    .menu-item:hover { background: #f9fafb; }
    .menu-item svg { color: #9ca3af; flex-shrink: 0; }
    .menu-item-danger { color: #dc2626; }
    .menu-item-danger svg { color: #dc2626; }
    .menu-item-danger:hover { background: #fef2f2; }

    /* ── Main content ── */
    .main-content { flex: 1; overflow-y: auto; min-width: 0; }
  `]
})
export class MainLayoutComponent {
  auth    = inject(AuthService);
  private session = inject(SessionService);
  private router  = inject(Router);

  dropdownOpen = signal(false);
  navCollapsed = signal(false);

  readonly modules = MODULE_DEFINITIONS;

  modulos = computed(() => this.session.session()?.modulos ?? []);

  navModules = computed(() =>
    MODULE_DEFINITIONS.filter(m => this.auth.hasModule(m.id))
  );

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    )
  );

  showSidebar = computed(() => {
    const url = this.currentUrl() ?? '';
    return !url.startsWith('/dashboard') && !url.startsWith('/preferencias');
  });

  sectionLabel = computed(() => {
    const url = this.currentUrl() ?? '';
    const mod = MODULE_DEFINITIONS.find(m =>
      url.startsWith(m.baseRoute) ||
      (m.extraRoutes?.some(r => url.startsWith(r)) ?? false)
    );
    if (mod) return mod.label;
    if (url.startsWith('/preferencias')) return 'Preferencias';
    return '';
  });

  toggleDropdown(): void { this.dropdownOpen.update(v => !v); }
  toggleNav(): void { this.navCollapsed.update(v => !v); }
  onLayoutClick(): void { if (this.dropdownOpen()) this.dropdownOpen.set(false); }
}
