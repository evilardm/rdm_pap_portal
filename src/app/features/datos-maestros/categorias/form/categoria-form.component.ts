import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DatosMaestrosService } from '../../../../core/services/datos-maestros.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

@Component({
  selector: 'app-categoria-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, HeaderComponent],
  templateUrl: './categoria-form.component.html',
  styleUrl: './categoria-form.component.scss',
})
export class CategoriaFormComponent implements OnInit {
  private fb      = inject(FormBuilder);
  private svc     = inject(DatosMaestrosService);
  private router  = inject(Router);
  private route   = inject(ActivatedRoute);

  editId = signal<string | null>(null);
  saving = signal(false);

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
  });

  get isEdit(): boolean { return this.editId() !== null; }
  get title(): string   { return this.isEdit ? 'Editar familia' : 'Nueva familia'; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const cat = this.svc.getCategoriaById(id);
      if (cat) {
        this.editId.set(id);
        this.form.patchValue({ nombre: cat.nombre });
      }
    }
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const val = this.form.value as any;
    setTimeout(() => {
      if (this.isEdit) {
        this.svc.updateCategoria(this.editId()!, { nombre: val.nombre });
      } else {
        this.svc.createCategoria({ nombre: val.nombre });
      }
      this.saving.set(false);
      this.router.navigate(['/maestros/categorias']);
    }, 300);
  }
}
