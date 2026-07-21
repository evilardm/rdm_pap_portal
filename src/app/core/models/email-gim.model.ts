export interface AdjuntoEmail {
  id: string;
  nombre: string;
  mimeType: string;
}

export interface EmailGim {
  messageId: string;
  from: string;
  subject: string;
  date: string;
  tieneAdjunto: boolean;
  cuerpo: string;
  adjuntos: AdjuntoEmail[];
}
