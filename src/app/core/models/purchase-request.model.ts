export type RequestStatus   = 'pending' | 'approved' | 'rejected' | 'draft';
export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Presupuesto {
  id: string;
  proveedor: string;
  precio: number;
  fecha: string;
  fileName: string;
  fileSize: number;
  fileData: string;
}

export interface RequestItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  subtotal: number;
  articuloId?: string;
  articuloNombre?: string;
}

export interface PurchaseRequest {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  status: RequestStatus;
  priority: RequestPriority;
  requesterId: string;
  requesterName: string;
  requesterDepartment: string;
  approverId?: string;
  approverName?: string;
  aprobadorId?: string;
  aprobadorNombre?: string;
  ordenMantenimiento?: string;
  items: RequestItem[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  comments?: string;
  rejectionReason?: string;
  tipoDocumentoId?: string;
  tipoDocumentoNombre?: string;
  supplier?: string;
  proveedorId?: string;
  expectedDeliveryDate?: Date;
  referencia?: string;
  presupuestos?: Presupuesto[];
  /** ID del paso de aprobación activo — necesario para POST /api/aprobaciones/{pasoId}/decidir */
  pasoId?: string;
}

export interface PurchaseRequestFilter {
  status?: RequestStatus | 'all';
  priority?: RequestPriority | 'all';
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}
