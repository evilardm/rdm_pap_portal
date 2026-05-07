import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TiposDocumentoService } from '../../../../core/services/tipos-compra.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

@Component({
  selector: 'app-tipo-documento-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, HeaderComponent],
  templateUrl: './tipo-compra-form.component.html',
  styleUrl: './tipo-compra-form.component.scss',
})
export class TipoDocumentoFormComponent implements OnInit {
  private fb     = inject(FormBuilder);
  private svc    = inject(TiposDocumentoService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  editId  = signal<string | null>(null);
  saving  = signal(false);
  loading = signal(false);
  error   = signal('');

  form = this.fb.group({
    codigo:      ['', [Validators.required, Validators.minLength(1)]],
    nombre:      ['', [Validators.required, Validators.minLength(2)]],
    descripcion: [''],
    modulo:      ['', Validators.required],
    activo:      [true],
  });

  get isEdit(): boolean { return this.editId() !== null; }
  get title(): string   { return this.isEdit ? 'Editar tipo de documento' : 'Nuevo tipo de documento'; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loading.set(true);
    this.svc.getById(id).subscribe({
      next: t => {
        this.editId.set(id);
        this.form.patchValue({ codigo: t.codigo, nombre: t.nombre, descripcion: t.descripcion ?? '', modulo: t.modulo, activo: t.activo });
        this.loading.set(false);
      },
      error: () => this.router.navigate(['/maestros/tipos-documento']),
    });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set('');
    const val = this.form.value;
    const payload = {
      codigo:      val.codigo!,
      nombre:      val.nombre!,
      descripcion: val.descripcion || undefined,
      modulo:      val.modulo!,
      activo:      val.activo ?? true,
    };
    const op$ = this.isEdit
      ? this.svc.update(this.editId()!, payload)
      : this.svc.create(payload);

    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/maestros/tipos-documento']);
      },
      error: err => {
        this.error.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.saving.set(false);
      },
    });
  }
}
