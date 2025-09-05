import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.prod';
import { of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private http = inject(HttpClient);

  createSession(items: {id:string; qty:number}[]) {
    if (!environment.checkoutEnabled || !environment.apiUrl) {
      // Evita llamadas en Vercel sin backend
      return of({ url: '#' });
    }
    return this.http.post<{url:string}>(`${environment.apiUrl}/api/pay/stripe/checkout`, { items });
  }
}
