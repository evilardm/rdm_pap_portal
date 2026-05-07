import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DatosMaestrosService } from '../../../../core/services/datos-maestros.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

@Component({
  selector: 'app-proveedor-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, HeaderComponent],
  templateUrl: './proveedor-form.component.html',
  styleUrl: './proveedor-form.component.scss',
})
export class ProveedorFormComponent implements OnInit {
  private fb     = inject(FormBuilder);
  svc            = inject(DatosMaestrosService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  editId = signal<string | null>(null);
  saving = signal(false);

  form = this.fb.group({
    nombre:      ['', [Validators.required, Validators.minLength(3)]],
    cif:         ['', Validators.required],
    fpag:        [''],
    pais:        [''],
    email:       ['', Validators.email],
    activo:      [true],
    fiscalValido:[false],
    comunitario: [false],
  });

  get isEdit(): boolean { return this.editId() !== null; }
  get title(): string   { return this.isEdit ? 'Editar proveedor' : 'Nuevo proveedor'; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const prov = this.svc.getProveedorById(id);
      if (prov) {
        this.editId.set(id);
        this.form.patchValue(prov);
      }
    }
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const val = this.form.value as any;
    const data = {
      nombre:      val.nombre,
      cif:         val.cif,
      fpag:        val.fpag ?? '',
      pais:        val.pais ?? '',
      email:       val.email ?? '',
      activo:      val.activo ?? true,
      fiscalValido:val.fiscalValido ?? false,
      comunitario: val.comunitario ?? false,
    };
    setTimeout(() => {
      if (this.isEdit) {
        this.svc.updateProveedor(this.editId()!, data);
      } else {
        this.svc.createProveedor(data);
      }
      this.saving.set(false);
      this.router.navigate(['/maestros/proveedores']);
    }, 300);
  }
}
