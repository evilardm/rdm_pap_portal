import { Injectable, signal, computed } from '@angular/core';
import { PedidoAbierto, PedidoAbiertoStatus, DocumentoAdjunto, PrecioMensual } from '../models/pedido-abierto.model';

// Minimal dummy PDF (valid 1-page PDF base64) reused in mock docs
const DUMMY_PDF = 'data:application/pdf;base64,JVBERi0xLjAKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PmVuZG9iagoyIDAgb2JqPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj5lbmRvYmoKMyAwIG9iajw8L1R5cGUvUGFnZS9NZWRpYUJveFswIDAgMyAzXT4+ZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKdHJhaWxlcjw8L1NpemUgNC9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjE5MAolJUVPRg==';

const MOCK_DATA: PedidoAbierto[] = [
  {
    id: '1',
    numero: 'PA-2024-001',
    proveedor: 'Servicios Integrales S.L.',
    descripcion: 'Contrato de mantenimiento anual de instalaciones eléctricas',
    status: 'abierto',
    importe: 48000,
    fechaInicio: new Date('2024-01-01'),
    fechaFin: new Date('2024-12-31'),
    notas: 'Revisiones mensuales incluidas. Contacto: Juan Pérez · 612345678',
    historialPrecios: [
      { id: 'hp1-1', mes: '2024-01', precio: 4000, notas: 'Precio negociado en contrato inicial' },
      { id: 'hp1-2', mes: '2024-02', precio: 4000 },
      { id: 'hp1-3', mes: '2024-03', precio: 3800, notas: 'Descuento por volumen Q1' },
    ],
    documentos: [
      {
        id: 'd1',
        nombre: 'Contrato firmado',
        descripcion: 'Contrato principal con todas las cláusulas',
        fileName: 'contrato-pa-2024-001.pdf',
        fileSize: 245760,
        fileData: DUMMY_PDF,
        uploadedAt: new Date('2024-01-02'),
      },
      {
        id: 'd2',
        nombre: 'Anexo técnico',
        descripcion: 'Especificaciones del alcance técnico',
        fileName: 'anexo-tecnico.pdf',
        fileSize: 131072,
        fileData: DUMMY_PDF,
        uploadedAt: new Date('2024-01-02'),
      },
    ],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
  {
    id: '2',
    numero: 'PA-2024-002',
    proveedor: 'Limpieza Premium S.A.',
    descripcion: 'Servicio de limpieza y mantenimiento de oficinas centrales',
    status: 'abierto',
    importe: 36000,
    fechaInicio: new Date('2024-02-01'),
    fechaFin: new Date('2025-01-31'),
    documentos: [
      {
        id: 'd3',
        nombre: 'Contrato de servicio',
        fileName: 'contrato-limpieza-2024.pdf',
        fileSize: 180224,
        fileData: DUMMY_PDF,
        uploadedAt: new Date('2024-02-01'),
      },
    ],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: '3',
    numero: 'PA-2024-003',
    proveedor: 'Suministros Office S.A.',
    descripcion: 'Suministro de material de oficina bajo demanda',
    status: 'abierto',
    importe: 15000,
    fechaInicio: new Date('2024-03-01'),
    documentos: [],
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: '4',
    numero: 'PA-2023-008',
    proveedor: 'IT Solutions S.L.',
    descripcion: 'Soporte técnico y mantenimiento de infraestructura IT',
    status: 'cerrado',
    importe: 60000,
    fechaInicio: new Date('2023-01-01'),
    fechaFin: new Date('2023-12-31'),
    notas: 'Contrato finalizado sin incidencias.',
    documentos: [
      {
        id: 'd4',
        nombre: 'Contrato IT 2023',
        fileName: 'contrato-it-2023.pdf',
        fileSize: 204800,
        fileData: DUMMY_PDF,
        uploadedAt: new Date('2023-01-03'),
      },
    ],
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2024-01-05'),
  },
];

@Injectable({ providedIn: 'root' })
export class PedidosAbiertosService {
  private _pedidos = signal<PedidoAbierto[]>(MOCK_DATA);

  readonly pedidos = this._pedidos.asReadonly();

  readonly stats = computed(() => {
    const all = this._pedidos();
    return {
      total:    all.length,
      abiertos: all.filter(p => p.status === 'abierto').length,
      cerrados: all.filter(p => p.status === 'cerrado').length,
      importeTotal: all.filter(p => p.status === 'abierto').reduce((s, p) => s + p.importe, 0),
    };
  });

  getById(id: string): PedidoAbierto | undefined {
    return this._pedidos().find(p => p.id === id);
  }

  create(data: Omit<PedidoAbierto, 'id' | 'documentos' | 'createdAt' | 'updatedAt'>): PedidoAbierto {
    const max = this._pedidos().reduce((m, p) => Math.max(m, +p.id), 0);
    const nuevo: PedidoAbierto = {
      ...data,
      id: String(max + 1),
      documentos: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this._pedidos.update(list => [nuevo, ...list]);
    return nuevo;
  }

  update(id: string, data: Omit<PedidoAbierto, 'id' | 'documentos' | 'createdAt' | 'updatedAt'>): void {
    this._pedidos.update(list =>
      list.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date() } : p)
    );
  }

  delete(id: string): void {
    this._pedidos.update(list => list.filter(p => p.id !== id));
  }

  addDocumento(pedidoId: string, data: Omit<DocumentoAdjunto, 'id' | 'uploadedAt'>): void {
    const doc: DocumentoAdjunto = {
      ...data,
      id: `doc-${Date.now()}`,
      uploadedAt: new Date(),
    };
    this._pedidos.update(list =>
      list.map(p => p.id !== pedidoId ? p : {
        ...p,
        documentos: [...p.documentos, doc],
        updatedAt: new Date(),
      })
    );
  }

  removeDocumento(pedidoId: string, docId: string): void {
    this._pedidos.update(list =>
      list.map(p => p.id !== pedidoId ? p : {
        ...p,
        documentos: p.documentos.filter(d => d.id !== docId),
        updatedAt: new Date(),
      })
    );
  }

  addPrecio(pedidoId: string, data: Omit<PrecioMensual, 'id'>): void {
    const nuevo: PrecioMensual = { ...data, id: `pm-${Date.now()}` };
    this._pedidos.update(list =>
      list.map(p => p.id !== pedidoId ? p : {
        ...p,
        historialPrecios: [...(p.historialPrecios ?? []), nuevo].sort((a, b) => a.mes.localeCompare(b.mes)),
        updatedAt: new Date(),
      })
    );
  }

  removePrecio(pedidoId: string, precioId: string): void {
    this._pedidos.update(list =>
      list.map(p => p.id !== pedidoId ? p : {
        ...p,
        historialPrecios: (p.historialPrecios ?? []).filter(h => h.id !== precioId),
        updatedAt: new Date(),
      })
    );
  }
}
