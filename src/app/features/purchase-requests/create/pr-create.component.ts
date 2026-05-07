import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PurchaseRequestService, PRIORIDAD_TO_API } from '../../../core/services/purchase-request.service';
import { AuthService } from '../../../core/services/auth.service';
import { DatosMaestrosService } from '../../../core/services/datos-maestros.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { DepartamentosService } from '../../../core/services/departamentos.service';
import { TiposDocumentoService } from '../../../core/services/tipos-compra.service';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { TypeaheadInputComponent } from '../../../shared/components/typeahead-input/typeahead-input.component';
import { ApiSolicitudCreatePayload, ApiLineaPayload } from '../../../core/models/api-solicitud.model';

@Component({
  selector: 'app-pr-create',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, HeaderComponent, TypeaheadInputComponent],
  templateUrl: './pr-create.component.html',
  styleUrl: './pr-create.component.scss',
})
export class PrCreateComponent implements OnInit {
  private fb         = inject(FormBuilder);
  private prService  = inject(PurchaseRequestService);
  private auth       = inject(AuthService);
  private maestros   = inject(DatosMaestrosService);
  private usuariosSvc = inject(UsuariosService);
  private router     = inject(Router);
  deptSvc            = inject(DepartamentosService);
  tiposDocumentoSvc  = inject(TiposDocumentoService);

  saving = signal(false);
  error  = signal('');

  aprobadores = computed(() =>
    this.usuariosSvc.usuarios()
      .filter(u => u.esAdmin || u.permisos.some(p => p.puedeAprobar))
      .map(u => ({ id: u.id, name: u.nombre, department: u.departamento }))
  );

  proveedorOptions = computed(() =>
    this.maestros.proveedores().map(p => ({ label: p.nombre, sublabel: p.id, value: p.nombre }))
  );

  articuloOptions = computed(() =>
    this.maestros.productos().map(p => ({ label: p.nombre, sublabel: p.id, value: p.nombre }))
  );

  form = this.fb.group({
    title:              ['', [Validators.required, Validators.minLength(5)]],
    description:        ['', Validators.required],
    priority:           ['medium', Validators.required],
    departamento:       [this.auth.currentUser()?.department ?? ''],
    tipoDocumentoId:    [''],
    supplier:           [''],
    referencia:         [''],
    ordenMantenimiento: [''],
    aprobadorId:        [''],
    expectedDeliveryDate: [''],
    items: this.fb.array([this.createItem()]),
  });

  get items(): FormArray { return this.form.get('items') as FormArray; }

  get totalAmount(): number {
    return this.items.controls.reduce((sum, ctrl) => {
      return sum + (+ctrl.get('quantity')?.value || 0) * (+ctrl.get('unitPrice')?.value || 0);
    }, 0);
  }

  createItem(): FormGroup {
    return this.fb.group({
      description: ['', Validators.required],
      quantity:    [1,  [Validators.required, Validators.min(1)]],
      unitPrice:   [0,  [Validators.required, Validators.min(0)]],
      unit:        ['pza', Validators.required],
    });
  }

  ngOnInit(): void {
    this.usuariosSvc.load();
    this.deptSvc.load();
    this.tiposDocumentoSvc.load();
  }

  addItem(): void  { this.items.push(this.createItem()); }
  removeItem(i: number): void { if (this.items.length > 1) this.items.removeAt(i); }

  getSubtotal(i: number): number {
    const ctrl = this.items.at(i);
    return (+ctrl.get('quantity')?.value || 0) * (+ctrl.get('unitPrice')?.value || 0);
  }

  onSubmit(asDraft = false): void {
    if (!asDraft && this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set('');

    const val      = this.form.value;
    const proveedorMatch = this.maestros.proveedores().find(p => p.nombre === val.supplier);

    const lineas: ApiLineaPayload[] = (val.items ?? []).map((item: any) => {
      const articuloMatch = this.maestros.productos().find(p => p.nombre === item.description);
      const linea: ApiLineaPayload = {
        descripcion:   item.description ?? '',
        cantidad:      +item.quantity,
        precioUnitario: +item.unitPrice,
        unidad:        item.unit ?? 'pza',
      };
      if (articuloMatch) {
        linea.articuloId     = articuloMatch.id;
        linea.articuloNombre = articuloMatch.nombre;
      }
      return linea;
    });

    const payload: ApiSolicitudCreatePayload = {
      titulo:       val.title ?? '',
      descripcion:  val.description ?? '',
      prioridad:    PRIORIDAD_TO_API[val.priority ?? 'medium'] ?? 'media',
      departamento: val.departamento || undefined,
      tipoDocumentoId: val.tipoDocumentoId || undefined,
      lineas,
      ...(proveedorMatch ? { proveedorId: proveedorMatch.id, proveedorNombre: proveedorMatch.nombre }
                         : val.supplier ? { proveedorNombre: val.supplier } : {}),
      ...(val.referencia         ? { referencia: val.referencia }                 : {}),
      ...(val.ordenMantenimiento ? { ordenMantenimiento: val.ordenMantenimiento } : {}),
      ...(val.expectedDeliveryDate ? { fechaEntregaPrevista: val.expectedDeliveryDate } : {}),
    };

    this.prService.create(payload).subscribe({
      next: created => {
        this.saving.set(false);
        this.router.navigate(['/solicitudes', created.id]);
        // TODO: llamar this.prService.enviar(created.id) cuando el backend implemente POST /api/solicitudes/{id}/enviar
      },
      error: err => {
        const msg = err.error?.mensaje ?? err.error?.message ?? err.error?.error ?? `Error ${err.status}`;
        this.error.set(msg);
        this.saving.set(false);
      },
    });
  }
}
