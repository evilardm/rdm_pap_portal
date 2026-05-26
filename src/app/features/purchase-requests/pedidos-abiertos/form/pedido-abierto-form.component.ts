import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PedidosAbiertosService } from '../../../../core/services/pedidos-abiertos.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

@Component({
  selector: 'app-pedido-abierto-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, HeaderComponent],
  templateUrl: './pedido-abierto-form.component.html',
  styleUrl: './pedido-abierto-form.component.scss',
})
export class PedidoAbiertoFormComponent implements OnInit {
  private fb     = inject(FormBuilder);
  private svc    = inject(PedidosAbiertosService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  editId  = signal<string | null>(null);
  saving  = signal(false);
  loading = signal(false);
  error   = signal('');

  form = this.fb.group({
    numero:      ['', [Validators.required, Validators.maxLength(30)]],
    proveedor:   ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required, Validators.minLength(5)]],
    status:      ['abierto', Validators.required],
    importe:     [0, [Validators.required, Validators.min(0)]],
    fechaInicio: ['', Validators.required],
    fechaFin:    [''],
    notas:       [''],
  });

  get isEdit(): boolean { return this.editId() !== null; }
  get title():  string  { return this.isEdit ? 'Editar contrato' : 'Nuevo contrato'; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.loading.set(true);
    this.svc.loadById(id);

    const check = () => {
      const p = this.svc.getById(id);
      if (p) {
        this.editId.set(id);
        this.form.patchValue({
          numero:      p.numero,
          proveedor:   p.proveedor,
          descripcion: p.descripcion,
          status:      p.status,
          importe:     p.importe,
          fechaInicio: p.fechaInicio.toISOString().substring(0, 10),
          fechaFin:    p.fechaFin ? p.fechaFin.toISOString().substring(0, 10) : '',
          notas:       p.notas ?? '',
        });
        this.loading.set(false);
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set('');
    const val = this.form.value as any;
    const data = {
      numero:      val.numero,
      proveedor:   val.proveedor,
      descripcion: val.descripcion,
      status:      val.status as any,
      importe:     +val.importe,
      fechaInicio: new Date(val.fechaInicio),
      fechaFin:    val.fechaFin ? new Date(val.fechaFin) : undefined,
      notas:       val.notas || undefined,
    };

    const obs$ = this.isEdit
      ? this.svc.update(this.editId()!, data)
      : this.svc.create(data);

    obs$.subscribe({
      next: p => {
        this.saving.set(false);
        this.router.navigate(['/solicitudes/pedidos-abiertos', p.id]);
      },
      error: err => {
        this.error.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.saving.set(false);
      },
    });
  }
}
