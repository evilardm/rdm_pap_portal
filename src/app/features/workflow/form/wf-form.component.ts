import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { WorkflowService } from '../../../core/services/workflow.service';
import { TiposDocumentoService } from '../../../core/services/tipos-compra.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import {
  WfFlujo, WfNivel, WfCondicionFlujo, WfCondicionNivel,
  WfCampoDocumento, WfOperador, WfLogica, WfTipoAprobador,
} from '../../../core/models/workflow.model';

export interface CondicionRow {
  id?: string;
  campo: string;
  operador: WfOperador;
  valor: string;
  logica: WfLogica;
  accion?: 'saltar' | 'requerir';
}

export interface NivelRow {
  id?: string;
  nombre: string;
  tipoAprobador: WfTipoAprobador;
  aprobadorValor: string;
  requiereTodos: boolean;
  condiciones: CondicionRow[];
  expanded: boolean;
}

export const WF_MODULOS = ['COMPRAS', 'VENTAS', 'PRODUCCION', 'MANTENIMIENTO'];

export const WF_DOCUMENTOS: Record<string, string[]> = {
  COMPRAS:        ['solicitud_de_compra', 'pedido_abierto'],
  VENTAS:         ['pedido_venta', 'factura_venta'],
  PRODUCCION:     ['orden_produccion'],
  MANTENIMIENTO:  ['orden_mantenimiento', 'solicitud_material'],
};

export const WF_OPERADORES: { value: WfOperador; label: string }[] = [
  { value: '=',        label: 'Igual a' },
  { value: '!=',       label: 'Distinto de' },
  { value: '>',        label: 'Mayor que' },
  { value: '<',        label: 'Menor que' },
  { value: '>=',       label: 'Mayor o igual' },
  { value: '<=',       label: 'Menor o igual' },
  { value: 'in',       label: 'Está en lista' },
  { value: 'contains', label: 'Contiene' },
];

@Component({
  selector: 'app-wf-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, NgTemplateOutlet, RouterLink, HeaderComponent],
  templateUrl: './wf-form.component.html',
  styleUrl: './wf-form.component.scss',
})
export class WfFormComponent implements OnInit {
  private fb              = inject(FormBuilder);
  svc                     = inject(WorkflowService);
  tiposDocumentoSvc       = inject(TiposDocumentoService);
  usuariosSvc             = inject(UsuariosService);
  private router          = inject(Router);
  private route           = inject(ActivatedRoute);

  editId  = signal<string | null>(null);
  saving  = signal(false);
  loading = signal(false);
  error   = signal('');

  // Signal que mantiene el módulo activo para que documentosDisponibles sea reactivo
  moduloActivo = signal('COMPRAS');

  modulos    = WF_MODULOS;
  operadores = WF_OPERADORES;

  condiciones = signal<CondicionRow[]>([]);
  niveles     = signal<NivelRow[]>([]);

  form = this.fb.group({
    nombre:      ['', [Validators.required, Validators.minLength(3)]],
    modulo:      ['COMPRAS', Validators.required],
    documento:   ['solicitud_presupuesto', Validators.required],
    descripcion: [''],
    activo:      [true],
  });

  get isEdit(): boolean { return this.editId() !== null; }
  get title(): string   { return this.isEdit ? 'Editar flujo' : 'Nuevo flujo de aprobación'; }

  documentosDisponibles = computed(() => {
    const mod = this.moduloActivo().toLowerCase();
    return this.tiposDocumentoSvc.tiposDocumento().filter(t => t.modulo.toLowerCase() === mod && t.activo);
  });

  // ── Helpers de campos ────────────────────────────────────────────────────

  getNivelAprobadorLabel(n: NivelRow): string {
    if (!n.aprobadorValor) return '—';
    if (n.tipoAprobador === 'usuario') {
      const u = this.usuariosSvc.usuarios().find(x => x.id === n.aprobadorValor);
      return u ? `${u.nombre} (${u.email})` : n.aprobadorValor;
    }
    return n.aprobadorValor;
  }

  getCampoInfo(campo: string): WfCampoDocumento | undefined {
    return this.svc.camposDocumento().find(c => c.campo === campo);
  }

  getCampoTipo(campo: string): string {
    return this.getCampoInfo(campo)?.tipo ?? 'text';
  }

  getCampoEnums(campo: string): string[] {
    return this.getCampoInfo(campo)?.valoresEnum ?? [];
  }

  // ── Ciclo de vida ────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.tiposDocumentoSvc.load();
    this.usuariosSvc.load();
    // Carga inicial de campos para los valores por defecto del form
    this.loadCamposActuales();

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.editId.set(id);
      this.loading.set(true);
      this.svc.getFlujoById(id).subscribe({
        next: flujo => {
          this.form.patchValue({
            nombre: flujo.nombre, modulo: flujo.modulo,
            documento: flujo.documento, descripcion: flujo.descripcion ?? '',
            activo: flujo.activo,
          });
          this.moduloActivo.set(flujo.modulo);
          this.svc.loadCampos(flujo.modulo, flujo.documento);
          this.condiciones.set(flujo.condiciones.map(c => ({
            id: c.id, campo: c.campo, operador: c.operador,
            valor: c.valor, logica: c.logica,
          })));
          this.niveles.set(flujo.niveles.map(n => ({
            id: n.id, nombre: n.nombre,
            tipoAprobador: n.tipoAprobador,
            aprobadorValor: n.aprobadorValor,
            requiereTodos: n.requiereTodos,
            condiciones: n.condiciones.map(c => ({
              id: c.id, campo: c.campo, operador: c.operador,
              valor: c.valor, logica: c.logica, accion: c.accion,
            })),
            expanded: false,
          })));
          this.loading.set(false);
        },
        error: err => {
          this.error.set(err.error?.mensaje ?? `Error ${err.status}`);
          this.loading.set(false);
        },
      });
    }
  }

  private loadCamposActuales(): void {
    const modulo    = this.form.get('modulo')!.value!;
    const documento = this.form.get('documento')!.value!;
    this.svc.loadCampos(modulo, documento);
  }

  onModuloChange(): void {
    const modulo = this.form.get('modulo')!.value!;
    this.moduloActivo.set(modulo);
    const docs = this.documentosDisponibles();
    const doc  = docs[0]?.id ?? '';
    this.form.patchValue({ documento: doc });
    this.svc.loadCampos(modulo, doc);
    // Limpiar campos seleccionados en condiciones existentes
    this.condiciones.update(list => list.map(c => ({ ...c, campo: '', valor: '' })));
    this.niveles.update(list => list.map(n => ({
      ...n, condiciones: n.condiciones.map(c => ({ ...c, campo: '', valor: '' })),
    })));
  }

  onDocumentoChange(): void {
    const modulo    = this.form.get('modulo')!.value!;
    const documento = this.form.get('documento')!.value!;
    this.svc.loadCampos(modulo, documento);
    this.condiciones.update(list => list.map(c => ({ ...c, campo: '', valor: '' })));
    this.niveles.update(list => list.map(n => ({
      ...n, condiciones: n.condiciones.map(c => ({ ...c, campo: '', valor: '' })),
    })));
  }

  // ── Condiciones de flujo ─────────────────────────────────────────────────

  addCondicion(): void {
    this.condiciones.update(list => [...list, {
      campo: '', operador: '=', valor: '', logica: 'AND',
    }]);
  }

  removeCondicion(i: number): void {
    this.condiciones.update(list => list.filter((_, idx) => idx !== i));
  }

  updateCondicion(i: number, field: keyof CondicionRow, value: string): void {
    this.condiciones.update(list => list.map((c, idx) => {
      if (idx !== i) return c;
      // Al cambiar campo, limpiar valor para no dejar datos inconsistentes
      if (field === 'campo') return { ...c, campo: value, valor: '' };
      return { ...c, [field]: value };
    }));
  }

  // ── Niveles ───────────────────────────────────────────────────────────────

  addNivel(): void {
    this.niveles.update(list => [...list, {
      nombre: `Nivel ${list.length + 1}`,
      tipoAprobador: 'rol',
      aprobadorValor: '',
      requiereTodos: false,
      condiciones: [],
      expanded: true,
    }]);
  }

  removeNivel(i: number): void {
    this.niveles.update(list => list.filter((_, idx) => idx !== i));
  }

  toggleNivel(i: number): void {
    this.niveles.update(list => list.map((n, idx) =>
      idx === i ? { ...n, expanded: !n.expanded } : n
    ));
  }

  moveNivel(i: number, dir: -1 | 1): void {
    this.niveles.update(list => {
      const arr = [...list];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return list;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }

  updateNivel(i: number, field: keyof NivelRow, value: string | boolean): void {
    this.niveles.update(list => list.map((n, idx) =>
      idx === i ? { ...n, [field]: value } : n
    ));
  }

  // ── Condiciones de nivel ─────────────────────────────────────────────────

  addCondicionNivel(nivelIdx: number): void {
    this.niveles.update(list => list.map((n, idx) =>
      idx !== nivelIdx ? n : {
        ...n,
        condiciones: [...n.condiciones, {
          campo: '', operador: '=' as WfOperador, valor: '',
          logica: 'AND' as WfLogica, accion: 'saltar' as const,
        }],
      }
    ));
  }

  removeCondicionNivel(nivelIdx: number, condIdx: number): void {
    this.niveles.update(list => list.map((n, idx) =>
      idx !== nivelIdx ? n : {
        ...n,
        condiciones: n.condiciones.filter((_, ci) => ci !== condIdx),
      }
    ));
  }

  updateCondicionNivel(nivelIdx: number, condIdx: number, field: keyof CondicionRow, value: string): void {
    this.niveles.update(list => list.map((n, idx) =>
      idx !== nivelIdx ? n : {
        ...n,
        condiciones: n.condiciones.map((c, ci) => {
          if (ci !== condIdx) return c;
          if (field === 'campo') return { ...c, campo: value, valor: '' };
          return { ...c, [field]: value };
        }),
      }
    ));
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const val = this.form.getRawValue();

    const condicionesFlujo: WfCondicionFlujo[] = this.condiciones().map((c, i) => ({
      id: c.id, orden: i + 1, campo: c.campo,
      operador: c.operador, valor: c.valor, logica: c.logica,
    }));

    const nivelesFlujo: WfNivel[] = this.niveles().map((n, i) => ({
      id: n.id, orden: i + 1, nombre: n.nombre,
      tipoAprobador: n.tipoAprobador,
      aprobadorValor: n.aprobadorValor,
      requiereTodos: n.requiereTodos,
      condiciones: n.condiciones.map((c, ci): WfCondicionNivel => ({
        id: c.id, orden: ci + 1, campo: c.campo,
        operador: c.operador, valor: c.valor, logica: c.logica,
        accion: c.accion ?? 'saltar',
      })),
    }));

    const payload: WfFlujo = {
      nombre: val.nombre ?? '',
      modulo: val.modulo ?? '',
      documento: val.documento ?? '',
      descripcion: val.descripcion ?? '',
      activo: val.activo ?? true,
      condiciones: condicionesFlujo,
      niveles: nivelesFlujo,
    };

    this.saving.set(true);
    this.error.set('');

    const id  = this.editId();
    const op$ = id ? this.svc.updateFlujo(id, payload) : this.svc.createFlujo(payload);

    op$.subscribe({
      next:  ()  => this.router.navigate(['/workflow']),
      error: err => {
        this.error.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.saving.set(false);
      },
    });
  }
}
