// src/app/services/product.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
// Usa UNA de las dos líneas siguientes:
import { environment } from '../../environments/environment.prod';
// import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  list(): Observable<Product[]> {
    if (environment.useLocalProducts) {
      // Sirve desde assets en Vercel (estático)
      return this.http.get<Product[]>('/assets/mock/products.json');
    }
    // Cuando tengas backend público, apiUrl no vacío
    return this.http.get<Product[]>(`${environment.apiUrl}/api/products`);
  }
}
