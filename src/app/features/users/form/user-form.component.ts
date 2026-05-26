import { Component, inject, signal, computed, effect, input, output } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { DepartamentosService } from '../../../core/services/departamentos.service';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { ApiUsuarioPermiso } from '../../../core/models/api-usuario.model';

export const AVAILABLE_MODULES = [
  { key: 'COMPRAS',     label: 'Compras' },
  { key: 'MASTER_DATA', label: 'Datos Maestros' },
  { key: 'VENTAS',      label: 'Ventas' },
  { key: 'PRODUCCION',  label: 'Producción' },
];

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, HeaderComponent],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss',
})
export class UserFormComponent {
  private fb      = inject(FormBuilder);
  private svc     = inject(UsuariosService);
  private router  = inject(Router);
  private route   = inject(ActivatedRoute);
  deptSvc         = inject(DepartamentosService);

  /** When null → create mode; when set → edit mode (used by embedded tabs) */
  userId     = input<string | null>(null);
  isEmbedded = input<boolean>(false);
  saved      = output<void>();

  isEdit  = signal(false);
  editId  = signal('');
  saving  = signal(false);
  error   = signal('');
  loading = signal(false);

  modules = AVAILABLE_MODULES;

  form = this.fb.group({
    nombre:       ['', [Validators.required, Validators.minLength(2)]],
    email:        ['', [Validators.required, Validators.email]],
    password:     [''],
    departamento: [''],
    esAdmin:      [false],
    activo:       [true],
    newPassword:  [''],
    permisos: this.fb.array(AVAILABLE_MODULES.map(m => this.newPermisoGroup(m.key))),
  });

  get permisos(): FormArray { return this.form.get('permisos') as FormArray; }
  get isAdminChecked(): boolean { return !!this.form.get('esAdmin')?.value; }
  get pageTitle(): string    { return this.isEdit() ? 'Editar usuario' : 'Nuevo usuario'; }
  get pageSubtitle(): string { return this.isEdit() ? 'Modifica los datos y permisos' : 'Completa los datos para crear un nuevo usuario'; }

  /** Resolves either the injected input or the route param (standalone mode) */
  private resolvedId = computed(() =>
    this.userId() ?? this.route.snapshot.paramMap.get('id') ?? null
  );

  constructor() {
    this.deptSvc.load();
    // Reinitialize form whenever the target user ID changes (tab switching)
    effect(() => this.reinitialize(this.resolvedId()));
  }

  private newPermisoGroup(modulo: string): FormGroup {
    return this.fb.group({
      modulo:        [modulo],
      puedeLeer:     [false],
      puedeEscribir: [false],
      puedeAprobar:  [false],
      esAdminModulo: [false],
    });
  }

  private reinitialize(id: string | null): void {
    this.error.set('');
    this.saving.set(false);
    this.form.reset({ nombre: '', email: '', password: '', departamento: '', esAdmin: false, activo: true, newPassword: '' });
    AVAILABLE_MODULES.forEach((m, i) =>
      this.permisos.at(i).reset({
        modulo: m.key, puedeLeer: false, puedeEscribir: false, puedeAprobar: false, esAdminModulo: false,
      })
    );

    if (id) {
      this.isEdit.set(true);
      this.editId.set(id);
      this.form.get('email')?.disable();
      this.form.get('password')?.clearValidators();
      this.form.get('password')?.updateValueAndValidity();
      this.loadUser(id);
    } else {
      this.isEdit.set(false);
      this.editId.set('');
      this.loading.set(false);
      this.form.get('email')?.enable();
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
      this.form.get('password')?.updateValueAndValidity();
    }
  }

  loadUser(id: string): void {
    this.loading.set(true);
    this.svc.getById(id).subscribe({
      next: u => {
        this.form.patchValue({ nombre: u.nombre, email: u.email, departamento: u.departamento, esAdmin: u.esAdmin, activo: u.activo ?? true });
        AVAILABLE_MODULES.forEach((m, i) => {
          const p = u.permisos.find(x => x.modulo === m.key);
          if (p) this.permisos.at(i).patchValue(p);
        });
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.loading.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set('');

    const val      = this.form.getRawValue();
    const permisos = val.permisos as ApiUsuarioPermiso[];

    const done = () => {
      this.saving.set(false);
      this.isEmbedded() ? this.saved.emit() : this.router.navigate(['/usuarios']);
    };

    if (this.isEdit()) {
      this.svc.update(this.editId(), {
        nombre: val.nombre ?? '', departamento: val.departamento ?? '',
        esAdmin: val.esAdmin ?? false, activo: val.activo ?? true, permisos,
      }).subscribe({
        next: () => {
          const pwd = val.newPassword?.trim();
          if (pwd) {
            this.svc.changePassword(this.editId(), pwd).subscribe({
              next: () => done(),
              error: err => {
                this.error.set('Guardado, pero error al cambiar contraseña: ' +
                  (err.error?.mensaje ?? err.error?.message ?? err.status));
                this.saving.set(false);
              },
            });
          } else {
            done();
          }
        },
        error: err => {
          this.error.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
          this.saving.set(false);
        },
      });
    } else {
      this.svc.create({
        email: val.email ?? '', nombre: val.nombre ?? '', password: val.password ?? '',
        departamento: val.departamento ?? '', esAdmin: val.esAdmin ?? false, permisos,
      }).subscribe({
        next: () => done(),
        error: err => {
          this.error.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
          this.saving.set(false);
        },
      });
    }
  }
}
