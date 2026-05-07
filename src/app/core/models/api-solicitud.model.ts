export interface ApiSolicitudLinea {
  id?: string;
  articuloId?: string;
  articuloNombre?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  unidad: string;
  subtotal?: number;
}

export interface ApiSolicitud {
  id: string;
  numeroSolicitud: string;
  titulo: string;
  descripcion: string;
  estado: 'borrador' | 'pendiente' | 'aprobada' | 'rechazada';
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  tipoDocumentoId?: string;
  tipoDocumentoNombre?: string;
  proveedorId?: string;
  proveedorNombre?: string;
  referencia?: string;
  ordenMantenimiento?: string;
  fechaEntregaPrevista?: string;
  importeTotal: number;
  lineas: ApiSolicitudLinea[];
  pasoId?: string;
  aprobadorId?: string;
  aprobadorNombre?: string;
  comentarios?: string;
  motivoRechazo?: string;
  solicitanteId?: string;
  solicitanteNombre?: string;
  solicitanteDepartamento?: string;
  creadoAt?: string;
  actualizadoAt?: string;
  aprobadoAt?: string;
  rechazadoAt?: string;
}

export interface ApiSolicitudCreatePayload {
  titulo: string;
  descripcion: string;
  prioridad: string;
  departamento?: string;
  tipoDocumentoId?: string;
  proveedorId?: string;
  proveedorNombre?: string;
  referencia?: string;
  ordenMantenimiento?: string;
  fechaEntregaPrevista?: string;
  lineas: ApiLineaPayload[];
}

export interface ApiLineaPayload {
  articuloId?: string;
  articuloNombre?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  unidad: string;
}

export interface ApiDecidirPayload {
  decision: 'aprobada' | 'rechazada';
  comentario?: string;
}
