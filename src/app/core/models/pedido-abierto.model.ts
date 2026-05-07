export type PedidoAbiertoStatus = 'abierto' | 'cerrado' | 'cancelado';

export interface PrecioMensual {
  id: string;
  mes: string;       // formato "YYYY-MM"
  precio: number;
  notas?: string;
}

export interface DocumentoAdjunto {
  id: string;
  nombre: string;
  descripcion?: string;
  fileName: string;
  fileSize: number;
  fileData: string;
  uploadedAt: Date;
}

export interface PedidoAbierto {
  id: string;
  numero: string;
  proveedor: string;
  descripcion: string;
  status: PedidoAbiertoStatus;
  importe: number;
  fechaInicio: Date;
  fechaFin?: Date;
  notas?: string;
  documentos: DocumentoAdjunto[];
  historialPrecios?: PrecioMensual[];
  createdAt: Date;
  updatedAt: Date;
}
