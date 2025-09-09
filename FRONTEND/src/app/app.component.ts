import { Component, HostBinding, HostListener, inject, signal, computed  } from '@angular/core';
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

    @HostBinding('class.dark') 
    dark = typeof window !== 'undefined' && localStorage.getItem('bk-theme') === 'dark';

    tab = signal<'home'|'shop'|'about'>('home');
    products = signal<Product[]>([]);
    selected: Product | null = null;
    imgIndex = 0;
    cartOpen = false;

    // ✅ fallback centralizado
    readonly FALLBACK_IMG = 'assets/img/placeholder.png';
    onImgErr = (e: Event) => ((e.target as HTMLImageElement).src = this.FALLBACK_IMG);

     // ===== Filtros =====
    filtersOpen = false;                    // drawer de filtros en móvil
    search = signal<string>('');           // búsqueda por nombre
    selectedTags = signal<Set<string>>(new Set());
    priceMin = signal(0);
    priceMax = signal(0);
    filterMin = signal(0);
    filterMax = signal(0);

    // Tags detectados (new, best, sale, drop…)
    readonly allTags = computed<string[]>(() => {
        const set = new Set<string>();
        for (const p of this.products()) if (p.tag) set.add(p.tag);
        return Array.from(set).sort();
    });

    // Lista filtrada
    readonly filteredProducts = computed<Product[]>(() => {
        const q = this.search().trim().toLowerCase();
        const tags = this.selectedTags();
        const min = this.filterMin();
        const max = this.filterMax();

        return this.products().filter(p => {
            const byName = !q || p.name.toLowerCase().includes(q);
            const byTag = tags.size === 0 || tags.has(p.tag);
            const byPrice = typeof p.price === 'number' && p.price >= min && p.price <= max;
            return byName && byTag && byPrice;
        });
    });

    constructor(){
        this.productSvc.list().subscribe(ps => {
            const normalized = ps.map(p => ({
                ...p,
                images: (p.images ?? []).map(src => this.normalizeAsset(src))
            }));
            this.products.set(normalized);
            // inicializar rango de precios
            const prices = normalized.map(p => Number(p.price)).filter(n => !isNaN(n));
            const min = prices.length ? Math.min(...prices) : 0;
            const max = prices.length ? Math.max(...prices) : 0;
            this.priceMin.set(min); this.priceMax.set(max);
            this.filterMin.set(min); this.filterMax.set(max);
        });
    }

    private normalizeAsset(src: string): string {
        if (!src) return this.FALLBACK_IMG;
        if (/^https?:\/\//i.test(src)) return src;      // ya es absoluta
        return src.replace(/^\/+/, '');                 // quita / inicial -> assets/...
    }

    trackById = (_: number, p: Product) => p._id;

    // Helpers filtros
    toggleTag(tag: string){
        const s = new Set(this.selectedTags());
        s.has(tag) ? s.delete(tag) : s.add(tag);
        this.selectedTags.set(s);
    }
    tagChecked(tag: string){ return this.selectedTags().has(tag); }
    clearFilters(){
        this.search.set('');
        this.selectedTags.set(new Set());
        this.filterMin.set(this.priceMin());
        this.filterMax.set(this.priceMax());
    }

    toggleTheme(){ 
        this.dark = !this.dark; 
        localStorage.setItem('bk-theme', this.dark? 'dark':'light'); 
    }

    openProduct(p: Product){ this.selected = p; this.imgIndex = 0; }
    closeProduct(){ this.selected = null; }                  // 👈 NUEVO
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

    // ⌨️ Accesos rápidos: ← → y Escape
    @HostListener('window:keydown', ['$event'])
    handleKey(e: KeyboardEvent){
        if (this.selected) {
            if (e.key === 'ArrowRight') this.next();
            if (e.key === 'ArrowLeft') this.prev();
            if (e.key === 'Escape') this.closeProduct();
        } else if (this.cartOpen && e.key === 'Escape') {
            this.cartOpen = false;
        }
    }
}