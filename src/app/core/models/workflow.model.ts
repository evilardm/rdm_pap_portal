export type WfOperador = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains';
export type WfLogica = 'AND' | 'OR';
export type WfTipoAprobador = 'usuario' | 'rol' | 'departamento';
export type WfEstadoInstancia = 'en_curso' | 'aprobado' | 'rechazado' | 'cancelado';
export type WfEstadoPaso = 'pendiente' | 'aprobado' | 'rechazado' | 'saltado';

export interface WfCondicionFlujo {
  id?: string;
  flujoId?: string;
  orden: number;
  campo: string;
  operador: WfOperador;
  valor: string;
  logica: WfLogica;
}

export interface WfCondicionNivel {
  id?: string;
  nivelId?: string;
  orden: number;
  campo: string;
  operador: WfOperador;
  valor: string;
  logica: WfLogica;
  accion: 'saltar' | 'requerir';
}

export interface WfNivel {
  id?: string;
  flujoId?: string;
  orden: number;
  nombre: string;
  tipoAprobador: WfTipoAprobador;
  aprobadorValor: string;
  requiereTodos: boolean;
  condiciones: WfCondicionNivel[];
}

export interface WfFlujo {
  id?: string;
  nombre: string;
  modulo: string;
  documento: string;
  descripcion?: string;
  activo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  condiciones: WfCondicionFlujo[];
  niveles: WfNivel[];
}

export interface WfInstancia {
  id: string;
  flujoId: string;
  flujoNombre?: string;
  modulo: string;
  documentoTipo: string;
  documentoId: string;
  estado: WfEstadoInstancia;
  nivelActual: number;
  datosDocumento: Record<string, unknown>;
  solicitanteId: string;
  createdAt?: Date;
  updatedAt?: Date;
  pasos: WfPaso[];
}

export interface WfPaso {
  id: string;
  instanciaId: string;
  nivelId: string;
  nivelNombre?: string;
  estado: WfEstadoPaso;
  aprobadorId?: string;
  aprobadorNombre?: string;
  comentario?: string;
  fechaAccion?: Date;
  createdAt?: Date;
}

// ── Campo documento ───────────────────────────────────────────────────────────

export type WfCampoTipo = 'text' | 'number' | 'boolean' | 'enum' | 'date';

export interface WfCampoDocumento {
  id?: string;
  modulo: string;
  documento: string;
  campo: string;
  label: string;
  tipo: WfCampoTipo;
  valoresEnum?: string[];
  orden: number;
}

// ── API DTOs (camelCase as returned by .NET) ──────────────────────────────────

export interface ApiWfCondicionFlujo {
  id: string;
  flujoId: string;
  orden: number;
  campo: string;
  operador: string;
  valor: string;
  logica: string;
}

export interface ApiWfCondicionNivel {
  id: string;
  nivelId: string;
  orden: number;
  campo: string;
  operador: string;
  valor: string;
  logica: string;
  accion: string;
}

export interface ApiWfNivel {
  id: string;
  flujoId: string;
  orden: number;
  nombre: string;
  tipoAprobador: string;
  aprobadorValor: string;
  requiereTodos: boolean;
  condiciones: ApiWfCondicionNivel[];
}

export interface ApiWfFlujo {
  id: string;
  nombre: string;
  modulo: string;
  documento: string;
  descripcion?: string;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
  condiciones: ApiWfCondicionFlujo[];
  niveles: ApiWfNivel[];
}

export interface ApiWfPaso {
  id: string;
  instanciaId: string;
  nivelId: string;
  nivelNombre?: string;
  orden: number;
  estado: string;
  aprobadorId?: string;
  aprobadorNombre?: string;
  comentario?: string;
  fechaAccion?: string;
  createdAt?: string;
}

export interface ApiWfInstancia {
  id: string;
  flujoId: string;
  flujoNombre?: string;
  modulo: string;
  documentoTipo: string;
  documentoId: string;
  estado: string;
  nivelActual: number;
  solicitanteId?: string;
  solicitanteNombre?: string;
  createdAt?: string;
  updatedAt?: string;
  pasos: ApiWfPaso[];
}

export interface ApiWfPendiente {
  instanciaId: string;
  pasoId: string;
  flujoNombre?: string;
  nivelNombre?: string;
  modulo: string;
  documentoTipo?: string;
  documentoId: string;
  solicitudNumero?: string;
  solicitudTitulo?: string;
  solicitanteNombre?: string;
  tipoDocumentoNombre?: string;
  importeTotal?: number;
  departamento?: string;
  createdAt?: string;
}

// ── Frontend models for instances ─────────────────────────────────────────────

export interface WfPendiente {
  instanciaId: string;
  pasoId: string;
  flujoNombre: string;
  nivelNombre: string;
  modulo: string;
  documentoId: string;
  solicitudNumero: string;
  solicitudTitulo: string;
  solicitanteNombre: string;
  tipoDocumentoNombre: string;
  importeTotal: number;
  departamento: string;
  createdAt?: Date;
}
