// src/app/services/cart.service.ts
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { Product } from '../models/product.model';

export interface CartItem { id: string; name: string; price: number; qty: number; img?: string; }

@Injectable({ providedIn: 'root' })
export class CartService {
  private key = 'bk-cart';

  // 👇 NADA de @Inject aquí. Usamos la función inject():
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private _items$ = new BehaviorSubject<CartItem[]>([]);
  items$ = this._items$.asObservable();

  constructor() {
    const initial = this.isBrowser ? JSON.parse(localStorage.getItem(this.key) ?? '[]') : [];
    this._items$.next(initial);
  }

  private save(items: CartItem[]) {
    if (this.isBrowser) localStorage.setItem(this.key, JSON.stringify(items));
    this._items$.next(items);
  }

  add(p: Product, qty = 1) {
    const items = [...this._items$.value];
    const i = items.findIndex(x => x.id === p._id);
    if (i >= 0) items[i] = { ...items[i], qty: items[i].qty + qty };
    else items.push({ id: p._id, name: p.name, price: p.price, qty, img: p.images?.[0] });
    this.save(items);
  }
  inc(id:string){ this.save(this._items$.value.map(i=>i.id===id?{...i,qty:i.qty+1}:i)); }
  dec(id:string){ this.save(this._items$.value.flatMap(i=>i.id!==id?i:(i.qty>1?{...i,qty:i.qty-1}:[]))); }
  remove(id:string){ this.save(this._items$.value.filter(i=>i.id!==id)); }
  clear(){ this.save([]); }
  total(){ return this._items$.value.reduce((s,i)=>s+i.price*i.qty,0); }
  snapshot(){ return this._items$.value; }
}