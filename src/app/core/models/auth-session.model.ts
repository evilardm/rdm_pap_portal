export interface ModuloPermiso {
  modulo: string;
  puedeLeer: boolean;
  puedeEscribir: boolean;
  puedeAprobar: boolean;
  esAdminModulo: boolean;
}

export interface AuthSession {
  token: string;
  nombre: string;
  email: string;
  esAdmin: boolean;
  modulos: ModuloPermiso[];
  expira: string;
}
