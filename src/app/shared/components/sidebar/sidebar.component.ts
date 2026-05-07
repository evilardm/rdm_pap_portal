import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { MODULE_DEFINITIONS } from '../../../core/models/permissions.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    )
  );

  private currentModuleDef = computed(() => {
    const url = this.currentUrl() ?? '';
    return MODULE_DEFINITIONS.find(m =>
      url.startsWith(m.baseRoute) ||
      (m.extraRoutes?.some(r => url.startsWith(r)) ?? false)
    ) ?? null;
  });

  moduleLabel = computed(() => this.currentModuleDef()?.label ?? '');
  moduleNewPath = computed(() => this.currentModuleDef()?.newPath ?? null);
  navGroups = computed(() => this.currentModuleDef()?.navGroups ?? []);
}
