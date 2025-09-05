import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.prod';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private http = inject(HttpClient);
  createSession(items: {id:string; qty:number}[]) {
    return this.http.post<{url:string}>(`${environment.apiUrl}/api/pay/stripe/checkout`, { items });
  }
}
