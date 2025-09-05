import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  list(): Observable<Product[]> {
    const base = environment.apiUrl.replace(/\/$/, '');
    return this.http.get<Product[]>(`${base}/api/products`);
  }
}
