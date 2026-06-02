import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { comprasReadGuard, comprasWriteGuard, comprasApproveGuard, maestrosReadGuard } from './core/guards/module.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      // Compras — Solicitudes
      {
        path: 'solicitudes',
        canActivate: [comprasReadGuard],
        loadComponent: () =>
          import('./features/purchase-requests/list/pr-list.component').then(m => m.PrListComponent),
      },
      {
        path: 'solicitudes/nueva',
        canActivate: [comprasWriteGuard],
        loadComponent: () =>
          import('./features/purchase-requests/create/pr-create.component').then(m => m.PrCreateComponent),
      },
      // Compras — Pedidos Abiertos (must be before :id to avoid conflict)
      {
        path: 'solicitudes/pedidos-abiertos',
        loadComponent: () =>
          import('./features/purchase-requests/pedidos-abiertos/list/pedidos-abiertos-list.component').then(m => m.PedidosAbiertosListComponent),
      },
      {
        path: 'solicitudes/pedidos-abiertos/nuevo',
        loadComponent: () =>
          import('./features/purchase-requests/pedidos-abiertos/form/pedido-abierto-form.component').then(m => m.PedidoAbiertoFormComponent),
      },
      {
        path: 'solicitudes/pedidos-abiertos/:id',
        loadComponent: () =>
          import('./features/purchase-requests/pedidos-abiertos/detail/pedido-abierto-detail.component').then(m => m.PedidoAbiertoDetailComponent),
      },
      {
        path: 'solicitudes/pedidos-abiertos/:id/editar',
        loadComponent: () =>
          import('./features/purchase-requests/pedidos-abiertos/form/pedido-abierto-form.component').then(m => m.PedidoAbiertoFormComponent),
      },
      {
        path: 'solicitudes/:id',
        loadComponent: () =>
          import('./features/purchase-requests/detail/pr-detail.component').then(m => m.PrDetailComponent),
      },
      {
        path: 'solicitudes/:id/editar',
        canActivate: [comprasWriteGuard],
        loadComponent: () =>
          import('./features/purchase-requests/edit/pr-edit.component').then(m => m.PrEditComponent),
      },
      // Bandeja de aprobaciones
      {
        path: 'aprobaciones',
        canActivate: [comprasApproveGuard],
        loadComponent: () =>
          import('./features/aprobaciones/pendientes/aprobaciones-pendientes.component').then(m => m.AprobacionesPendientesComponent),
      },
      // Ventas
      {
        path: 'ventas',
        loadComponent: () =>
          import('./features/ventas/ventas.component').then(m => m.VentasComponent),
      },
      // Producción
      {
        path: 'produccion',
        loadComponent: () =>
          import('./features/produccion/produccion.component').then(m => m.ProduccionComponent),
      },
      // Sin permiso
      {
        path: 'sin-permiso',
        loadComponent: () =>
          import('./features/auth/sin-permiso/sin-permiso.component').then(m => m.SinPermisoComponent),
      },
      // Datos Maestros
      { path: 'maestros', redirectTo: 'maestros/productos', pathMatch: 'full' },
      {
        path: 'maestros/productos',
        canActivate: [maestrosReadGuard],
        loadComponent: () =>
          import('./features/datos-maestros/productos/list/productos-list.component').then(m => m.ProductosListComponent),
      },
      {
        path: 'maestros/productos/nuevo',
        loadComponent: () =>
          import('./features/datos-maestros/productos/form/producto-form.component').then(m => m.ProductoFormComponent),
      },
      {
        path: 'maestros/productos/:id/editar',
        loadComponent: () =>
          import('./features/datos-maestros/productos/form/producto-form.component').then(m => m.ProductoFormComponent),
      },
      {
        path: 'maestros/proveedores',
        canActivate: [maestrosReadGuard],
        loadComponent: () =>
          import('./features/datos-maestros/proveedores/list/proveedores-list.component').then(m => m.ProveedoresListComponent),
      },
      {
        path: 'maestros/proveedores/nuevo',
        loadComponent: () =>
          import('./features/datos-maestros/proveedores/form/proveedor-form.component').then(m => m.ProveedorFormComponent),
      },
      {
        path: 'maestros/proveedores/:id/editar',
        loadComponent: () =>
          import('./features/datos-maestros/proveedores/form/proveedor-form.component').then(m => m.ProveedorFormComponent),
      },
      {
        path: 'maestros/clientes',
        loadComponent: () =>
          import('./features/datos-maestros/clientes/list/clientes-list.component').then(m => m.ClientesListComponent),
      },
      {
        path: 'maestros/clientes/nuevo',
        loadComponent: () =>
          import('./features/datos-maestros/clientes/form/cliente-form.component').then(m => m.ClienteFormComponent),
      },
      {
        path: 'maestros/clientes/:id/editar',
        loadComponent: () =>
          import('./features/datos-maestros/clientes/form/cliente-form.component').then(m => m.ClienteFormComponent),
      },
      {
        path: 'maestros/categorias',
        canActivate: [maestrosReadGuard],
        loadComponent: () =>
          import('./features/datos-maestros/categorias/list/categorias-list.component').then(m => m.CategoriasListComponent),
      },
      {
        path: 'maestros/categorias/nuevo',
        loadComponent: () =>
          import('./features/datos-maestros/categorias/form/categoria-form.component').then(m => m.CategoriaFormComponent),
      },
      {
        path: 'maestros/categorias/:id/editar',
        loadComponent: () =>
          import('./features/datos-maestros/categorias/form/categoria-form.component').then(m => m.CategoriaFormComponent),
      },
      {
        path: 'maestros/inversiones',
        canActivate: [maestrosReadGuard],
        loadComponent: () =>
          import('./features/datos-maestros/inversiones/list/inversiones-list.component').then(m => m.InversionesListComponent),
      },
      {
        path: 'maestros/formas-pago',
        canActivate: [maestrosReadGuard],
        loadComponent: () =>
          import('./features/datos-maestros/formas-pago/list/formas-pago-list.component').then(m => m.FormasPagoListComponent),
      },
      {
        path: 'maestros/tipos-documento',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/datos-maestros/tipos-compra/list/tipos-compra-list.component').then(m => m.TiposDocumentoListComponent),
      },
      {
        path: 'maestros/tipos-documento/nuevo',
        loadComponent: () =>
          import('./features/datos-maestros/tipos-compra/form/tipo-compra-form.component').then(m => m.TipoDocumentoFormComponent),
      },
      {
        path: 'maestros/tipos-documento/:id/editar',
        loadComponent: () =>
          import('./features/datos-maestros/tipos-compra/form/tipo-compra-form.component').then(m => m.TipoDocumentoFormComponent),
      },
      // Usuarios (solo admin)
      {
        path: 'usuarios',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/users/list/users-list.component').then(m => m.UsersListComponent),
      },
      {
        path: 'usuarios/nuevo',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/users/form/user-form.component').then(m => m.UserFormComponent),
      },
      {
        path: 'usuarios/:id/editar',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/users/form/user-form.component').then(m => m.UserFormComponent),
      },
      // Workflow (solo admin)
      {
        path: 'workflow',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/workflow/list/wf-list.component').then(m => m.WfListComponent),
      },
      {
        path: 'workflow/nuevo',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/workflow/form/wf-form.component').then(m => m.WfFormComponent),
      },
      {
        path: 'workflow/:id',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/workflow/form/wf-form.component').then(m => m.WfFormComponent),
      },
      // Preferencias del usuario (cualquier usuario autenticado)
      {
        path: 'preferencias',
        loadComponent: () =>
          import('./features/preferences/preferences.component').then(m => m.PreferencesComponent),
      },
      // Configuración (solo admin)
      {
        path: 'configuracion',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/settings/settings.component').then(m => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
