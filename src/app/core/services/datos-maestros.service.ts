import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Categoria } from '../models/categoria.model';
import { Producto } from '../models/producto.model';
import { Proveedor } from '../models/proveedor.model';
import { Cliente } from '../models/cliente.model';
import { PaginatedResponse, ApiProveedor, ApiFamilia, ApiArticulo } from '../models/api.model';
import { API_BASE } from '../interceptors/api-key.interceptor';

// ── Mock fallbacks (se usan mientras la API de familias/artículos no esté disponible) ──

const MOCK_CATEGORIAS: Categoria[] = [];

const MOCK_PRODUCTOS: Producto[] = [];

const MOCK_CLIENTES: Cliente[] = [
  { id: '1', nombre: 'Empresa ABC S.A.',         nif: 'A11223344', direccion: 'Paseo de la Castellana 100, 28046 Madrid',  telefono: '912345678', email: 'compras@empresa-abc.com' },
  { id: '2', nombre: 'Distribuciones XYZ S.L.',  nif: 'B55443322', direccion: 'Calle Industria 23, 46010 Valencia',        telefono: '963456789', email: 'pedidos@distribuciones-xyz.es' },
  { id: '3', nombre: 'Comercial Norte S.A.',      nif: 'A99887766', direccion: 'Gran Vía 55, 48001 Bilbao',                telefono: '944567890', email: 'compras@comercial-norte.com' },
];

const PAGE_SIZE = 100;

@Injectable({ providedIn: 'root' })
export class DatosMaestrosService {
  private http = inject(HttpClient);

  private _categorias  = signal<Categoria[]>(MOCK_CATEGORIAS);
  private _productos   = signal<Producto[]>(MOCK_PRODUCTOS);
  private _proveedores = signal<Proveedor[]>([]);
  private _clientes    = signal<Cliente[]>(MOCK_CLIENTES);

  readonly categorias  = this._categorias.asReadonly();
  readonly productos   = this._productos.asReadonly();
  readonly proveedores = this._proveedores.asReadonly();
  readonly clientes    = this._clientes.asReadonly();

  readonly loadingProveedores = signal(false);
  readonly loadingFamilias    = signal(false);
  readonly loadingArticulos   = signal(false);
  readonly errorProveedores   = signal<string | null>(null);
  readonly errorFamilias      = signal<string | null>(null);
  readonly errorArticulos     = signal<string | null>(null);

  constructor() {
    this.loadProveedores();
    this.loadFamilias();
    this.loadArticulos();
  }

  // ── Carga desde API ──────────────────────────────────────────────────────────

  private loadAllPages<T>(path: string): Observable<T[]> {
    const url = `${API_BASE}${path}`;
    const params = { pagina: '1', tamano: String(PAGE_SIZE) };

    return this.http.get<PaginatedResponse<T>>(url, { params }).pipe(
      switchMap(first => {
        if (first.totalPaginas <= 1) return of(first.items);
        const rest$ = Array.from({ length: first.totalPaginas - 1 }, (_, i) =>
          this.http.get<PaginatedResponse<T>>(url, {
            params: { pagina: String(i + 2), tamano: String(PAGE_SIZE) },
          }).pipe(map(r => r.items))
        );
        return forkJoin(rest$).pipe(map(pages => [...first.items, ...pages.flat()]));
      }),
    );
  }

  private loadProveedores(): void {
    this.loadingProveedores.set(true);
    this.errorProveedores.set(null);

    this.loadAllPages<ApiProveedor>('/api/proveedores').pipe(
      catchError(err => {
        this.errorProveedores.set('No se pudo cargar la lista de proveedores.');
        console.error('API proveedores error:', err);
        return of([] as ApiProveedor[]);
      }),
    ).subscribe(items => {
      this._proveedores.set(items.map(p => ({
        id:           p.id,
        nombre:       p.nombre,
        activo:       p.activo,
        cif:          p.cif.trim(),
        fpag:         p.fpag.trim(),
        fiscalValido: p.fiscalValido,
        pais:         p.pais.trim(),
        email:        p.email,
        comunitario:  p.comunitario,
      })));
      this.loadingProveedores.set(false);
    });
  }

  private loadFamilias(): void {
    this.loadingFamilias.set(true);
    this.errorFamilias.set(null);

    this.loadAllPages<ApiFamilia>('/api/familias').pipe(
      catchError(err => {
        this.errorFamilias.set('No se pudo cargar la lista de categorías.');
        console.warn('API familias error:', err);
        return of([] as ApiFamilia[]);
      }),
    ).subscribe(items => {
      if (items.length > 0) {
        this._categorias.set(items.map(f => ({
          id:     f.id,
          nombre: f.nombre,
        })));
      }
      this.loadingFamilias.set(false);
    });
  }

  private loadArticulos(): void {
    this.loadingArticulos.set(true);
    this.errorArticulos.set(null);

    this.loadAllPages<ApiArticulo>('/api/articulos').pipe(
      catchError(err => {
        this.errorArticulos.set('No se pudo cargar la lista de artículos.');
        console.warn('API artículos error:', err);
        return of([] as ApiArticulo[]);
      }),
    ).subscribe(items => {
      if (items.length > 0) {
        this._productos.set(items.map(a => ({
          id:         a.id,
          nombre:     a.nombre,
          familia:    a.familia,
          subfamilia: a.subfamilia,
          marca:      a.marca,
          baja:       a.baja,
          costUlt1:   a.costUlt1,
          observacio: a.observacio,
        })));
      }
      this.loadingArticulos.set(false);
    });
  }

  // ── Categorías ───────────────────────────────────────────────────────────────

  getCategoriaById(id: string): Categoria | undefined {
    return this._categorias().find(c => c.id === id);
  }

  createCategoria(data: Omit<Categoria, 'id'>): Categoria {
    const nuevo: Categoria = { ...data, id: this.nextId(this._categorias()) };
    this._categorias.update(list => [...list, nuevo]);
    return nuevo;
  }

  updateCategoria(id: string, data: Omit<Categoria, 'id'>): void {
    this._categorias.update(list => list.map(c => c.id === id ? { ...data, id } : c));
  }

  deleteCategoria(id: string): void {
    this._categorias.update(list => list.filter(c => c.id !== id));
  }

  // ── Productos ─────────────────────────────────────────────────────────────────

  getProductoById(id: string): Producto | undefined {
    return this._productos().find(p => p.id === id);
  }

  getProductosByFamilia = computed(() => (familia: string) =>
    this._productos().filter(p => p.familia === familia)
  );

  createProducto(data: Omit<Producto, 'id'>): Producto {
    const nuevo: Producto = { ...data, id: this.nextId(this._productos()) };
    this._productos.update(list => [...list, nuevo]);
    return nuevo;
  }

  updateProducto(id: string, data: Omit<Producto, 'id'>): void {
    this._productos.update(list => list.map(p => p.id === id ? { ...data, id } : p));
  }

  deleteProducto(id: string): void {
    this._productos.update(list => list.filter(p => p.id !== id));
  }

  // ── Proveedores ───────────────────────────────────────────────────────────────

  getProveedorById(id: string): Proveedor | undefined {
    return this._proveedores().find(p => p.id === id);
  }

  createProveedor(data: Omit<Proveedor, 'id'>): Proveedor {
    const id = this.nextId(this._proveedores());
    const nuevo: Proveedor = { ...data, id };
    this._proveedores.update(list => [...list, nuevo]);
    return nuevo;
  }

  updateProveedor(id: string, data: Partial<Proveedor>): void {
    this._proveedores.update(list =>
      list.map(p => p.id === id ? { ...p, ...data } : p)
    );
  }

  deleteProveedor(id: string): void {
    this._proveedores.update(list => list.filter(p => p.id !== id));
  }

  // ── Clientes ──────────────────────────────────────────────────────────────────

  getClienteById(id: string): Cliente | undefined {
    return this._clientes().find(c => c.id === id);
  }

  createCliente(data: Omit<Cliente, 'id'>): Cliente {
    const nuevo: Cliente = { ...data, id: this.nextId(this._clientes()) };
    this._clientes.update(list => [...list, nuevo]);
    return nuevo;
  }

  updateCliente(id: string, data: Omit<Cliente, 'id'>): void {
    this._clientes.update(list => list.map(c => c.id === id ? { ...data, id } : c));
  }

  deleteCliente(id: string): void {
    this._clientes.update(list => list.filter(c => c.id !== id));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private nextId(list: { id: string }[]): string {
    const max = list.reduce((m, item) => Math.max(m, +item.id || 0), 0);
    return String(max + 1);
  }
}
