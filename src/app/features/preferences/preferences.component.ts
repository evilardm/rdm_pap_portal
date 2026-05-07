import { Component, inject, signal, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { HeaderComponent } from '../../shared/components/header/header.component';

function passwordsMatch(g: AbstractControl): ValidationErrors | null {
  const a = g.get('nuevaContrasena')?.value;
  const b = g.get('confirmarContrasena')?.value;
  return a && b && a !== b ? { mismatch: true } : null;
}

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, HeaderComponent],
  templateUrl: './preferences.component.html',
  styleUrl: './preferences.component.scss',
})
export class PreferencesComponent implements OnInit {
  private fb          = inject(FormBuilder);
  auth                = inject(AuthService);
  private sessionSvc  = inject(SessionService);
  private usuariosSvc = inject(UsuariosService);

  /** Real UUID returned by the API — used for update/password calls */
  private apiUserId = signal<string | null>(null);

  loading = signal(true);

  saving  = signal(false);
  saved   = signal(false);
  error   = signal('');

  savingPwd  = signal(false);
  savedPwd   = signal(false);
  errorPwd   = signal('');

  form = this.fb.group({
    nombre:      ['', [Validators.required, Validators.minLength(2)]],
    departamento:[''],
  });

  pwdForm = this.fb.group({
    nuevaContrasena:    ['', [Validators.required, Validators.minLength(6)]],
    confirmarContrasena:['', Validators.required],
  }, { validators: passwordsMatch });

  get modulos() { return this.sessionSvc.session()?.modulos ?? []; }

  ngOnInit(): void {
    const emailId = this.auth.currentUser()?.id;   // equals email in current session
    if (!emailId) { this.loading.set(false); return; }

    this.usuariosSvc.getById(emailId).subscribe({
      next: u => {
        this.apiUserId.set(u.id);   // store real UUID from API
        this.form.patchValue({ nombre: u.nombre, departamento: u.departamento ?? '' });
        this.loading.set(false);
      },
      error: () => {
        const s = this.sessionSvc.session();
        this.form.patchValue({ nombre: s?.nombre ?? '' });
        this.loading.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const id = this.apiUserId();
    if (!id) return;

    this.saving.set(true);
    this.saved.set(false);
    this.error.set('');

    const session = this.sessionSvc.session()!;
    const val     = this.form.value;

    this.usuariosSvc.update(id, {
      nombre:       val.nombre!,
      departamento: val.departamento ?? '',
      esAdmin:      session.esAdmin,
      permisos:     session.modulos,
    }).subscribe({
      next: () => {
        this.sessionSvc.set({ ...session, nombre: val.nombre! });
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: err => {
        this.error.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.saving.set(false);
      },
    });
  }

  onChangePassword(): void {
    if (this.pwdForm.invalid) { this.pwdForm.markAllAsTouched(); return; }
    const id = this.apiUserId();
    if (!id) return;

    this.savingPwd.set(true);
    this.savedPwd.set(false);
    this.errorPwd.set('');

    const pwd = this.pwdForm.value.nuevaContrasena!;

    this.usuariosSvc.changePassword(id, pwd).subscribe({
      next: () => {
        this.pwdForm.reset();
        this.savingPwd.set(false);
        this.savedPwd.set(true);
        setTimeout(() => this.savedPwd.set(false), 3000);
      },
      error: err => {
        this.errorPwd.set(err.error?.mensaje ?? err.error?.message ?? `Error ${err.status}`);
        this.savingPwd.set(false);
      },
    });
  }
}
