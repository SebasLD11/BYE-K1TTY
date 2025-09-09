import { Component, HostBinding, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from './services/product.service';
import { CartService } from './services/cart.service';
import { CheckoutService } from './services/checkout.service';
import { Product } from './models/product.model';


@Component({
selector: 'app-root',
standalone: true,
imports: [CommonModule],
templateUrl: './app.component.html',
styleUrls: ['./app.component.scss']
})
export class AppComponent {
    private productSvc = inject(ProductService);
    cartSvc = inject(CartService);
    private checkout = inject(CheckoutService);

    @HostBinding('class.dark') dark = typeof window !== 'undefined' && localStorage.getItem('bk-theme') === 'dark';

    tab = signal<'home'|'shop'|'about'>('home');
    products = signal<Product[]>([]);
    selected: Product | null = null;
    imgIndex = 0;
    cartOpen = false;

    // ✅ fallback centralizado
    readonly FALLBACK_IMG = 'assets/img/placeholder.png';
    onImgErr = (e: Event) => ((e.target as HTMLImageElement).src = this.FALLBACK_IMG);

    constructor(){
        this.productSvc.list().subscribe(ps => {
            const normalized = ps.map(p => ({
                ...p,
                images: (p.images ?? []).map(src => this.normalizeAsset(src))
            }));
            this.products.set(normalized);
        });
    }

    private normalizeAsset(src: string): string {
        if (!src) return this.FALLBACK_IMG;
        if (/^https?:\/\//i.test(src)) return src;      // ya es absoluta
        return src.replace(/^\/+/, '');                 // quita / inicial -> assets/...
    }
    
    trackById = (_: number, p: Product) => p._id;

    toggleTheme(){ 
        this.dark = !this.dark; localStorage.setItem('bk-theme', this.dark? 'dark':'light'); 
    }

    openProduct(p: Product){ this.selected = p; this.imgIndex = 0; }
    next(){ if(this.selected) this.imgIndex = (this.imgIndex + 1) % this.selected.images.length; }
    prev(){ if(this.selected) this.imgIndex = (this.imgIndex - 1 + this.selected.images.length) % this.selected.images.length; }

    addFromModal(){
        if(!this.selected) return;
        this.cartSvc.add(this.selected);
        this.selected = null; this.cartOpen = true;
    }

    checkoutNow(){
        const items = this.cartSvc.snapshot().map(i=>({ id: i.id, qty: i.qty }));
        if(!items.length) return;
        this.checkout.createSession(items).subscribe(({url}) => window.location.href = url);
    }
}