export type AppModule = 'compras' | 'ventas' | 'produccion' | 'maestros' | 'usuarios' | 'workflow' | 'configuracion';

export interface ModuleAction {
  id: string;
  label: string;
}

export interface NavItem {
  label: string;
  path: string;
  /** If set, the item is only shown when auth.hasPermission(requiredPermission) is true */
  requiredPermission?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface ModuleDefinition {
  id: AppModule;
  label: string;
  baseRoute: string;
  /** Additional URL prefixes that also belong to this module (for sidebar matching). */
  extraRoutes?: string[];
  newPath?: string;
  actions: ModuleAction[];
  navGroups: NavGroup[];
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: 'compras',
    label: 'Compras',
    baseRoute: '/solicitudes',
    newPath: '/solicitudes/nueva',
    actions: [
      { id: 'compras.crear_solicitud',   label: 'Crear solicitudes' },
      { id: 'compras.aprobar_solicitud', label: 'Aprobar solicitudes' },
      { id: 'compras.ver_todas',         label: 'Ver todas las solicitudes' },
      { id: 'compras.ver_precios',       label: 'Ver precios' },
    ],
    extraRoutes: ['/aprobaciones'],
    navGroups: [
      {
        label: 'MENÚ',
        items: [
          { label: 'Solicitudes',      path: '/solicitudes' },
          { label: 'Pedidos Abiertos', path: '/solicitudes/pedidos-abiertos' },
          { label: 'Aprobaciones', path: '/aprobaciones', requiredPermission: 'compras.aprobar_solicitud' },
        ],
      },
      {
        label: 'GESTIÓN',
        items: [{ label: 'Nueva solicitud', path: '/solicitudes/nueva' }],
      },
    ],
  },
  {
    id: 'ventas',
    label: 'Ventas',
    baseRoute: '/ventas',
    actions: [
      { id: 'ventas.crear_pedido', label: 'Crear pedido de venta' },
      { id: 'ventas.ver_precios',  label: 'Ver precios de venta' },
      { id: 'ventas.ver_todos',    label: 'Ver todos los pedidos' },
    ],
    navGroups: [
      {
        label: 'MENÚ',
        items: [{ label: 'Pedidos de venta', path: '/ventas' }],
      },
    ],
  },
  {
    id: 'produccion',
    label: 'Producción',
    baseRoute: '/produccion',
    actions: [
      { id: 'produccion.crear_orden', label: 'Crear orden de producción' },
      { id: 'produccion.ver_todas',   label: 'Ver todas las órdenes' },
    ],
    navGroups: [
      {
        label: 'MENÚ',
        items: [{ label: 'Órdenes de producción', path: '/produccion' }],
      },
    ],
  },
  {
    id: 'maestros',
    label: 'Datos Maestros',
    baseRoute: '/maestros',
    actions: [
      { id: 'maestros.gestionar_productos',   label: 'Gestionar productos' },
      { id: 'maestros.gestionar_proveedores', label: 'Gestionar proveedores' },
      { id: 'maestros.gestionar_clientes',    label: 'Gestionar clientes' },
      { id: 'maestros.gestionar_categorias',  label: 'Gestionar categorías' },
    ],
    navGroups: [
      {
        label: 'GESTIÓN',
        items: [
          { label: 'Productos',   path: '/maestros/productos' },
          { label: 'Proveedores', path: '/maestros/proveedores' },
          { label: 'Clientes',    path: '/maestros/clientes' },
          { label: 'Categorías',  path: '/maestros/categorias' },
          { label: 'Inversiones', path: '/maestros/inversiones' },
        ],
      },
    ],
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    baseRoute: '/configuracion',
    extraRoutes: ['/usuarios', '/workflow', '/maestros/tipos-documento'],
    actions: [],
    navGroups: [
      {
        label: 'USUARIOS',
        items: [
          { label: 'Todos los usuarios', path: '/usuarios' },
        ],
      },
      {
        label: 'WORKFLOWS',
        items: [
          { label: 'Flujos de aprobación', path: '/workflow' },
        ],
      },
      {
        label: 'DATOS MAESTROS',
        items: [
          { label: 'Tipos de documento', path: '/maestros/tipos-documento' },
        ],
      },
      {
        label: 'SISTEMA',
        items: [
          { label: 'Configuración del sistema', path: '/configuracion' },
        ],
      },
    ],
  },
];
