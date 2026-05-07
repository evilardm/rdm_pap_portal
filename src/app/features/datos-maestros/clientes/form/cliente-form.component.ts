import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DatosMaestrosService } from '../../../../core/services/datos-maestros.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, HeaderComponent],
  templateUrl: './cliente-form.component.html',
  styleUrl: './cliente-form.component.scss',
})
export class ClienteFormComponent implements OnInit {
  private fb     = inject(FormBuilder);
  private svc    = inject(DatosMaestrosService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  editId = signal<string | null>(null);
  saving = signal(false);

  form = this.fb.group({
    nombre:    ['', [Validators.required, Validators.minLength(3)]],
    nif:       ['', [Validators.required, Validators.pattern(/^[A-Z0-9]\d{7}[A-Z0-9]$/)]],
    direccion: ['', Validators.required],
    telefono:  ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
    email:     ['', [Validators.required, Validators.email]],
  });

  get isEdit(): boolean { return this.editId() !== null; }
  get title(): string   { return this.isEdit ? 'Editar cliente' : 'Nuevo cliente'; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const cli = this.svc.getClienteById(id);
      if (cli) {
        this.editId.set(id);
        this.form.patchValue(cli);
      }
    }
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const val = this.form.value as any;
    setTimeout(() => {
      if (this.isEdit) {
        this.svc.updateCliente(this.editId()!, val);
      } else {
        this.svc.createCliente(val);
      }
      this.saving.set(false);
      this.router.navigate(['/maestros/clientes']);
    }, 300);
  }
}
