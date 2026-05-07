export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  pagina: number;
  tamano: number;
  totalPaginas: number;
}

export interface ApiProveedor {
  id: string;
  nombre: string;
  activo: boolean;
  cif: string;
  pais: string;
  mod349: boolean;
  comunitario: boolean;
  fiscalValido: boolean;
  fpag: string;
  banco: string;
  pronto: number;
  diaPag: number;
  email: string;
  noComuEmail: boolean;
  noComuSms: boolean;
  noComuCarta: boolean;
  updatedAt: string;
}

export interface ApiFamilia {
  id: string;
  nombre: string;
  margen: number;
  descuen: number;
  orden: number;
  updatedAt: string;
}

export interface ApiArticulo {
  id: string;
  nombre: string;
  familia: string;
  subfamilia: string;
  marca: string;
  baja: boolean;
  costUlt1: number;
  imagen: string;
  observacio: string;
  updatedAt: string;
}
