import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../services/session.service';

export const API_BASE = '';

const API_KEY = '1db3f5e2d5ae205447e529e14516815b4f6056f0b6fb5a2aa8f5f3d134ea0475';

export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api')) return next(req);

  // SessionService has no HttpClient dep — safe to inject here
  const sessionSvc = inject(SessionService);
  const router     = inject(Router);
  const token      = sessionSvc.getToken();

  const headers: Record<string, string> = {
    'X-Api-Key': API_KEY,
    'ngrok-skip-browser-warning': 'true',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return next(req.clone({ setHeaders: headers })).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        sessionSvc.clear();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
