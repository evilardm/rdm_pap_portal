import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DatosMaestrosService } from '../../../../core/services/datos-maestros.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

@Component({
  selector: 'app-producto-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, HeaderComponent],
  templateUrl: './producto-form.component.html',
  styleUrl: './producto-form.component.scss',
})
export class ProductoFormComponent implements OnInit {
  private fb     = inject(FormBuilder);
  svc            = inject(DatosMaestrosService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  editId = signal<string | null>(null);
  saving = signal(false);

  form = this.fb.group({
    nombre:     ['', [Validators.required, Validators.minLength(3)]],
    familia:    ['', Validators.required],
    subfamilia: [''],
    marca:      [''],
    baja:       [false],
    costUlt1:   [0, [Validators.min(0)]],
    observacio: [''],
  });

  get isEdit(): boolean { return this.editId() !== null; }
  get title(): string   { return this.isEdit ? 'Editar artículo' : 'Nuevo artículo'; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const prod = this.svc.getProductoById(id);
      if (prod) {
        this.editId.set(id);
        this.form.patchValue({
          nombre:     prod.nombre,
          familia:    prod.familia,
          subfamilia: prod.subfamilia,
          marca:      prod.marca,
          baja:       prod.baja,
          costUlt1:   prod.costUlt1,
          observacio: prod.observacio,
        });
      }
    }
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const val = this.form.value as any;
    const data = {
      nombre:     val.nombre,
      familia:    val.familia,
      subfamilia: val.subfamilia ?? '',
      marca:      val.marca ?? '',
      baja:       val.baja ?? false,
      costUlt1:   val.costUlt1 ?? 0,
      observacio: val.observacio ?? '',
    };
    setTimeout(() => {
      if (this.isEdit) {
        this.svc.updateProducto(this.editId()!, data);
      } else {
        this.svc.createProducto(data);
      }
      this.saving.set(false);
      this.router.navigate(['/maestros/productos']);
    }, 300);
  }
}
