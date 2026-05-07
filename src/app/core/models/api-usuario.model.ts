export interface ApiUsuarioPermiso {
  modulo: string;
  puedeLeer: boolean;
  puedeEscribir: boolean;
  puedeAprobar: boolean;
  esAdminModulo: boolean;
}

export interface ApiUsuario {
  id: string;
  email: string;
  nombre: string;
  departamento: string;
  esAdmin: boolean;
  activo?: boolean;
  creadoAt?: string;
  permisos: ApiUsuarioPermiso[];
}

export interface ApiUsuarioCreatePayload {
  email: string;
  nombre: string;
  password: string;
  departamento: string;
  esAdmin: boolean;
  permisos: ApiUsuarioPermiso[];
}

export interface ApiUsuarioUpdatePayload {
  nombre: string;
  departamento: string;
  esAdmin: boolean;
  permisos: ApiUsuarioPermiso[];
}
