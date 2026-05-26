import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PurchaseRequestService, PRIORIDAD_TO_API } from '../../../core/services/purchase-request.service';
import { DatosMaestrosService } from '../../../core/services/datos-maestros.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { TiposDocumentoService } from '../../../core/services/tipos-compra.service';
import { InversionesService } from '../../../core/services/inversiones.service';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { TypeaheadInputComponent } from '../../../shared/components/typeahead-input/typeahead-input.component';
import { ApiSolicitudUpdatePayload, ApiLineaUpdatePayload } from '../../../core/models/api-solicitud.model';

const PRIORIDAD_FROM_API: Record<string, string> = {
  baja: 'low', media: 'medium', alta: 'high', urgente: 'urgent',
};

@Component({
  selector: 'app-pr-edit',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, HeaderComponent, TypeaheadInputComponent],
  templateUrl: './pr-edit.component.html',
  styleUrl: './pr-edit.component.scss',
})
export class PrEditComponent implements OnInit {
  private fb         = inject(FormBuilder);
  private prService  = inject(PurchaseRequestService);
  private maestros   = inject(DatosMaestrosService);
  private usuariosSvc = inject(UsuariosService);
  private router     = inject(Router);
  private route      = inject(ActivatedRoute);
  tiposDocumentoSvc  = inject(TiposDocumentoService);
  inversionesSvc     = inject(InversionesService);

  saving  = signal(false);
  loading = signal(true);
  error   = signal('');

  id = '';

  proveedorOptions = computed(() =>
    this.maestros.proveedores().map(p => ({ label: p.nombre, sublabel: p.id, value: p.nombre }))
  );

  articuloOptions = computed(() =>
    this.maestros.productos().map(p => ({ label: p.nombre, sublabel: p.id, value: p.nombre }))
  );

  compradores = computed(() =>
    this.usuariosSvc.usuarios().map(u => ({ id: u.id, nombre: u.nombre }))
  );

  inversionOptions = computed(() =>
    this.inversionesSvc.inversiones()
      .filter(i => !i.cerrada)
      .map(i => ({ label: i.codigo, sublabel: i.descripcion, value: i.codigo }))
  );

  form = this.fb.group({
    titulo:             ['', [Validators.required, Validators.minLength(5)]],
    descripcion:        ['', Validators.required],
    prioridad:          ['medium', Validators.required],
    tipoDocumentoId:    [''],
    proveedor:          [''],
    referencia:         [''],
    ordenMantenimiento: [''],
    fechaEntregaPrevista: [''],
    comentarios:        [''],
    inversion:          [false],
    codigoInversion:    [''],
    compradorId:        [''],
    lineas: this.fb.array([this.createLinea()]),
  });

  get lineas(): FormArray { return this.form.get('lineas') as FormArray; }

  get totalAmount(): number {
    return this.lineas.controls.reduce((sum, ctrl) =>
      sum + (+ctrl.get('cantidad')?.value || 0) * (+ctrl.get('precioUnitario')?.value || 0), 0);
  }

  createLinea(): FormGroup {
    return this.fb.group({
      descripcion:    ['', Validators.required],
      articuloId:     [''],
      articuloNombre: [''],
      articuloRefId:  [''],
      cantidad:       [1,  [Validators.required, Validators.min(1)]],
      precioUnitario: [0,  [Validators.required, Validators.min(0)]],
      unidad:         ['pza', Validators.required],
      orden:          [0],
    });
  }

  getSubtotal(i: number): number {
    const ctrl = this.lineas.at(i);
    return (+ctrl.get('cantidad')?.value || 0) * (+ctrl.get('precioUnitario')?.value || 0);
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.usuariosSvc.load();
    this.tiposDocumentoSvc.load();
    this.inversionesSvc.load();

    this.prService.loadById(this.id);

    // Wait for the signal to update with full data
    const checkLoaded = () => {
      const req = this.prService.requests().find(r => r.id === this.id);
      if (req) {
        this.prefill(req);
        this.loading.set(false);
      } else {
        setTimeout(checkLoaded, 100);
      }
    };
    checkLoaded();
  }

  private prefill(req: any): void {
    this.form.patchValue({
      titulo:             req.title,
      descripcion:        req.description,
      prioridad:          req.priority,
      tipoDocumentoId:    req.tipoDocumentoId ?? '',
      proveedor:          req.supplier ?? '',
      referencia:         req.referencia ?? '',
      ordenMantenimiento: req.ordenMantenimiento ?? '',
      fechaEntregaPrevista: req.expectedDeliveryDate
        ? new Date(req.expectedDeliveryDate).toISOString().split('T')[0] : '',
      comentarios:        req.comments ?? '',
      inversion:          req.inversion ?? false,
      codigoInversion:    req.codigoInversion ?? '',
      compradorId:        req.compradorId ?? '',
    });

    // Rebuild lineas array
    while (this.lineas.length) this.lineas.removeAt(0);
    (req.items ?? []).forEach((item: any, i: number) => {
      this.lineas.push(this.fb.group({
        descripcion:    [item.description, Validators.required],
        articuloId:     [item.articuloId ?? ''],
        articuloNombre: [item.articuloNombre ?? ''],
        articuloRefId:  [item.articuloRefId ?? ''],
        cantidad:       [item.quantity, [Validators.required, Validators.min(1)]],
        precioUnitario: [item.unitPrice, [Validators.required, Validators.min(0)]],
        unidad:         [item.unit ?? 'pza', Validators.required],
        orden:          [item.orden ?? i],
      }));
    });
    if (!this.lineas.length) this.lineas.push(this.createLinea());
  }

  addLinea(): void  { this.lineas.push(this.createLinea()); }
  removeLinea(i: number): void { if (this.lineas.length > 1) this.lineas.removeAt(i); }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set('');

    const val = this.form.getRawValue();
    const proveedorMatch = this.maestros.proveedores().find(p => p.nombre === val.proveedor);

    const lineas: ApiLineaUpdatePayload[] = val.lineas.map((l: any, i: number) => ({
      descripcion:    l.descripcion ?? '',
      cantidad:       +l.cantidad,
      precioUnitario: +l.precioUnitario,
      unidad:         l.unidad ?? 'pza',
      orden:          l.orden ?? i,
      ...(l.articuloId     ? { articuloId: l.articuloId }         : {}),
      ...(l.articuloNombre ? { articuloNombre: l.articuloNombre } : {}),
      ...(l.articuloRefId  ? { articuloRefId: l.articuloRefId }   : {}),
    }));

    const payload: ApiSolicitudUpdatePayload = {
      titulo:       val.titulo ?? '',
      descripcion:  val.descripcion ?? '',
      prioridad:    PRIORIDAD_TO_API[val.prioridad ?? 'medium'] ?? 'media',
      lineas,
      ...(proveedorMatch
        ? { proveedorId: proveedorMatch.id, proveedorNombre: proveedorMatch.nombre }
        : val.proveedor ? { proveedorNombre: val.proveedor } : {}),
      ...(val.tipoDocumentoId      ? { tipoDocumentoId: val.tipoDocumentoId }           : {}),
      ...(val.referencia           ? { referencia: val.referencia }                     : {}),
      ...(val.ordenMantenimiento   ? { ordenMantenimiento: val.ordenMantenimiento }     : {}),
      ...(val.fechaEntregaPrevista ? { fechaEntregaPrevista: val.fechaEntregaPrevista } : {}),
      ...(val.comentarios          ? { comentarios: val.comentarios }                   : {}),
      ...(val.compradorId          ? { compradorId: val.compradorId }                   : {}),
      inversion:       val.inversion ?? false,
      ...(val.codigoInversion ? { codigoInversion: val.codigoInversion } : {}),
    };

    this.prService.update(this.id, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/solicitudes', this.id]);
      },
      error: err => {
        this.error.set(err.error?.mensaje ?? err.error?.message ?? err.error?.error ?? `Error ${err.status}`);
        this.saving.set(false);
      },
    });
  }
}
