export interface TipoDocumento {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  modulo: string;
  activo: boolean;
}
