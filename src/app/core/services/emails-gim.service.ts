import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EmailGim } from '../models/email-gim.model';

@Injectable({ providedIn: 'root' })
export class EmailsGimService {
  private http = inject(HttpClient);

  getPorOferta(ofertaId: string): Observable<EmailGim[]> {
    return this.http.get<EmailGim[]>('/api/emails/por-oferta', { params: { ofertaId } });
  }

  getAdjunto(messageId: string, attachmentId: string): Observable<Blob> {
    return this.http.get('/api/emails/adjunto', {
      params: { messageId, attachmentId },
      responseType: 'blob',
    });
  }
}
