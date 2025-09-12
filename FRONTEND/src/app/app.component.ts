import { Component, HostBinding, HostListener, inject, signal, computed, effect  } from '@angular/core';
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
    // Guarda el último foco para devolverlo al cerrar (opcional)
    private _lastFocus: HTMLElement | null = null;

    @HostBinding('class.dark') 
    dark = typeof window !== 'undefined' && localStorage.getItem('bk-theme') === 'dark';

    tab = signal<'home'|'shop'|'about'>('shop');
    products = signal<Product[]>([]);
    selected: Product | null = null;
    imgIndex = 0;
    cartOpen = false;
    selectedSize: string | null = null;
    // Muestra el banner solo la primera vez por sesión
    showEntry = !(typeof window !== 'undefined' && sessionStorage.getItem('bk-entry') === '1');

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
            const normalized = ps.map(p => ({ ...p, images: (p.images ?? []).map(src => this.normalizeAsset(src)) }));
            this.products.set(normalized);
            const prices = normalized.map(p => Number(p.price)).filter(n => !isNaN(n));
            const min = prices.length ? Math.min(...prices) : 0;
            const max = prices.length ? Math.max(...prices) : 0;
            this.priceMin.set(min); this.priceMax.set(max);
            this.filterMin.set(min); this.filterMax.set(max);
        });
        // ✅ Mejora accesible (opcional): bloquear scroll y hacer inerte el fondo
        effect(() => {
            // en el effect(): ya no depende de tab
            const overlayOpen = this.cartOpen || this.filtersOpen || !!this.selected;

            // Bloquea scroll del body
            document.body.classList.toggle('no-scroll', overlayOpen);

            // Marca fondo como inert cuando hay MODAL (producto) o CARRITO
            const main = document.querySelector('main') as HTMLElement | null;
            const topnav = document.querySelector('.topnav') as HTMLElement | null;
            const inert = !!(this.selected || this.cartOpen );
            if (main) (main as any).inert = inert;
            if (topnav) (topnav as any).inert = inert;

            // Gestión de foco: al abrir, enfoca botón cerrar del overlay
            queueMicrotask(() => {
                if (this.cartOpen) {
                    this._focusById('cartClose');
                } else if (this.selected) {
                    this._focusById('modalClose');
                } else if (this._lastFocus) {
                // al cerrar, devolvemos el foco donde estaba
                    this._lastFocus.focus();
                    this._lastFocus = null;
                }
            });
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

    openProduct(p: Product){ 
        // Guarda el foco ANTES de abrir el modal
        this._rememberFocus();

        this.selected = p;
        this.imgIndex = 0;
        // preselecciona primera talla si hay
        this.selectedSize = Array.isArray(p?.sizes) && p.sizes.length ? p.sizes[0] : null;
    }
    closeProduct(){ 
        this.selected = null;
        this.selectedSize = null; 
    }                  // 👈 NUEVO
    next(){ if(this.selected) this.imgIndex = (this.imgIndex + 1) % this.selected.images.length; }
    prev(){ if(this.selected) this.imgIndex = (this.imgIndex - 1 + this.selected.images.length) % this.selected.images.length; }

    // Guarda el foco actual antes de abrir overlays
    private _rememberFocus() {
        this._lastFocus = (document.activeElement as HTMLElement) ?? null;
    }
    private _focusById(id: string) {
        const el = document.getElementById(id) as HTMLElement | null;
        if (el) el.focus();
    }
    addFromModal(){
        if(!this.selected) return;

        const size = (this.selected?.sizes?.length ? this.selectedSize : null) || null;

        // Guarda el foco ANTES de abrir el carrito
        this._rememberFocus();

        this.cartSvc.add(this.selected, size);
        this.closeProduct();      // <- basta con esto (evita el set null duplicado)
        this.cartOpen = true;     // abre el carrito para feedback inmediato
    }

    checkoutNow(){
        const items = this.cartSvc.toCheckoutItems(); // [{id, qty, size}]
        if(!items.length) return;
        this.checkout.createSession(items).subscribe(({url}) => window.location.href = url);
    }

    enterShop(){
        this.showEntry = false;
        this.tab.set('shop');

        // 🔧 HOTFIX: limpia el bloqueo que dejó el effect inicial
        try {
            document.body.classList.remove('no-scroll');
            const main = document.querySelector('main') as HTMLElement | null;
            const topnav = document.querySelector('.topnav') as HTMLElement | null;
            if (main) (main as any).inert = false;
            if (topnav) (topnav as any).inert = false;
        } catch {}

        if (typeof window !== 'undefined') {
            sessionStorage.setItem('bk-entry','1');
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const target = document.getElementById('shopTop') || (document.querySelector('.shop') as HTMLElement | null);
                    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    else window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            });
        }
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