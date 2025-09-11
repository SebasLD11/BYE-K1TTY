// src/app/services/cart.service.ts
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { Product } from '../models/product.model';

export interface CartItem {
  key: string;                 // id__SIZE (o id__ONE si no hay talla)
  id: string;
  name: string;
  price: number;
  qty: number;
  img?: string;
  size?: string | null;        // null si el producto no tiene tallas
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private key = 'bk-cart';
  // 👇 NADA de @Inject aquí. Usamos la función inject():
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private _items$ = new BehaviorSubject<CartItem[]>([]);
  items$ = this._items$.asObservable();

  constructor() {
    const raw = this.isBrowser ? JSON.parse(localStorage.getItem(this.key) ?? '[]') : [];
    const initial = this.normalizeLegacy(raw);
    this._items$.next(initial);
    // opcional: guarda normalizado para “migrar” el storage antiguo
    this.save(initial);
  }

  /** Convierte formato viejo (sin key/size) -> nuevo, y asegura tipos */
  private normalizeLegacy(items: any[]): CartItem[] {
    if (!Array.isArray(items)) return [];
    return items.map((i: any) => {
      const id   = String(i?.id ?? '');
      const name = String(i?.name ?? '');
      const price= Number(i?.price ?? 0);
      const qty  = Math.max(1, Number(i?.qty ?? 1));
      const img  = i?.img ? String(i.img) : undefined;
      const size = typeof i?.size === 'string' ? i.size : null;
      const key  = String(i?.key ?? `${id}__${size ?? 'ONE'}`);
      return { key, id, name, price, qty, img, size };
    }).filter(i => i.id);
  }

  private save(items: CartItem[]) {
    if (this.isBrowser) localStorage.setItem(this.key, JSON.stringify(items));
    this._items$.next(items);
  }

  /** Añadir con talla opcional (por defecto null) */
  add(p: Product, size: string | null = null, qty = 1) {
    const key = `${p._id}__${size ?? 'ONE'}`;
    const items = [...this._items$.value];
    const idx = items.findIndex(x => x.key === key);

    if (idx >= 0) {
      items[idx] = { ...items[idx], qty: items[idx].qty + qty };
    } else {
      items.push({
        key,
        id: String(p._id),
        name: p.name,
        price: p.price,
        qty: Math.max(1, qty),
        img: p.images?.[0],
        size
      });
    }
    this.save(items);
  }
  /** Operaciones ahora por key (id+talla) */
  inc(key: string) {
    this.save(this._items$.value.map(i => i.key === key ? { ...i, qty: i.qty + 1 } : i));
  }
  dec(key: string) {
    this.save(
      this._items$.value.flatMap(i =>
        i.key !== key ? i : (i.qty > 1 ? { ...i, qty: i.qty - 1 } : [])
      )
    );
  }
  remove(key: string) {
    this.save(this._items$.value.filter(i => i.key !== key));
  }

  clear() { this.save([]); }

  total() { return this._items$.value.reduce((s, i) => s + i.price * i.qty, 0); }

  snapshot() { return this._items$.value; }

  /** Útil para el checkout: id, qty, size */
  toCheckoutItems() {
    return this._items$.value.map(i => ({ id: i.id, qty: i.qty, size: i.size ?? null }));
  }
}