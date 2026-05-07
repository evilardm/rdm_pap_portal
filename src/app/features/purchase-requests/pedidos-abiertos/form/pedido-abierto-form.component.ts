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

  editId = signal<string | null>(null);
  saving = signal(false);

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
    if (id) {
      const p = this.svc.getById(id);
      if (p) {
        this.editId.set(id);
        this.form.patchValue({
          numero:      p.numero,
          proveedor:   p.proveedor,
          descripcion: p.descripcion,
          status:      p.status,
          importe:     p.importe,
          fechaInicio: this.toDateStr(p.fechaInicio),
          fechaFin:    p.fechaFin ? this.toDateStr(p.fechaFin) : '',
          notas:       p.notas ?? '',
        });
      }
    }
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
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
    setTimeout(() => {
      if (this.isEdit) {
        this.svc.update(this.editId()!, data);
        this.saving.set(false);
        this.router.navigate(['/solicitudes/pedidos-abiertos', this.editId()]);
      } else {
        const nuevo = this.svc.create(data);
        this.saving.set(false);
        this.router.navigate(['/solicitudes/pedidos-abiertos', nuevo.id]);
      }
    }, 300);
  }

  private toDateStr(d: Date): string {
    return d.toISOString().substring(0, 10);
  }
}
