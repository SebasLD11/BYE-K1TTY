// src/app/services/product.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
// Usa UNA de las dos líneas siguientes:
import { environment } from '../../environments/environment';
// import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  list(): Observable<Product[]> {
    return this.http.get<Product[]>(`${environment.apiUrl}/api/products`);
  }
}
