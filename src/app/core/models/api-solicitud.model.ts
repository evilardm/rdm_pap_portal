export interface ApiSolicitudLinea {
  id?: string;
  articuloId?: string;
  articuloNombre?: string;
  articuloRefId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  unidad: string;
  subtotal?: number;
  orden?: number;
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
  gimId?: number;
  ofertaGim?: number;
  formaPagoId?: string;
  formaPagoNombre?: string;
  inversion?: boolean;
  codigoInversion?: string;
  compradorId?: string;
  numeroPedido?: number;
  createdAt?: string;
  updatedAt?: string;
  creadoAt?: string;
  actualizadoAt?: string;
  aprobadoAt?: string;
  rechazadoAt?: string;
  presupuestos?: ApiPresupuesto[];
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

export interface ApiLineaUpdatePayload {
  articuloId?: string;
  articuloNombre?: string;
  articuloRefId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  unidad: string;
  orden?: number;
}

export interface ApiSolicitudUpdatePayload {
  titulo: string;
  descripcion: string;
  prioridad: string;
  ordenMantenimiento?: string;
  proveedorId?: string;
  proveedorNombre?: string;
  referencia?: string;
  fechaEntregaPrevista?: string;
  comentarios?: string;
  tipoDocumentoId?: string;
  inversion?: boolean;
  codigoInversion?: string;
  compradorId?: string;
  formaPagoId?: string;
  lineas: ApiLineaUpdatePayload[];
}

export interface ApiDecidirPayload {
  decision: 'aprobada' | 'rechazada';
  comentario?: string;
}

export interface ApiPresupuesto {
  id: string;
  proveedor: string;
  precio: number;
  fecha: string;
  numeroOferta?: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  comentarios?: string;
}

export interface ApiPresupuestoCreatePayload {
  proveedor: string;
  precio: number;
  fecha: string;
  numeroOferta?: string;
  fileName?: string;
  fileSize?: number;
  fileData?: string;
  comentarios?: string;
}
