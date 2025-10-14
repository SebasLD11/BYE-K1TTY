import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CartService } from '../services/cart.service';
import { CheckoutService, ShippingSel } from '../services/checkout.service';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-checkout-summary',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout-summary.component.html',
  styleUrls: ['./checkout-summary.component.scss']
})
export class CheckoutSummaryComponent {
    cart = inject(CartService);
    api = inject(CheckoutService);

    private fb = inject(NonNullableFormBuilder);
    private router = inject(Router);


    form = this.fb.group({
        fullName: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required]],
        line1: ['', [Validators.required]],
        line2: [''],
        city: ['', [Validators.required]],
        province: ['', [Validators.required]],
        postalCode: ['', [Validators.required]],
        country: ['ES', [Validators.required]],
        discountCode: ['']
    });

    loading = signal(false);
    orderId = signal<string|undefined>(undefined);
    shippingOptions = signal<ShippingSel[]>([]);
    shipping = signal<ShippingSel|undefined>(undefined);
    summary = signal<any|null>(null);

    items = computed(() => this.cart.snapshot().map(i => ({ id:i.id, qty:i.qty, size: i.size ?? null })));

    /** Total correcto: precios YA tienen IVA → total = (subtotal - descuento) + envío */
    readonly grandTotal = computed(() => {
        const s = this.summary();
        if (!s) return 0;
        const shipCost = this.shipping()?.cost ?? 0;
        return +(s.subtotal - s.discountAmount + shipCost).toFixed(2);
    });

    submitSummary() {
        if (!this.items().length || this.form.invalid) return;
        this.loading.set(true);
        const buyer = this.form.getRawValue();

        this.api.summary({ items: this.items(), buyer, discountCode: buyer.discountCode || null })
        .subscribe({
            next: res => {
            this.orderId.set(res.orderId);
            this.summary.set(res);
            this.shippingOptions.set(res.shippingOptions || []);
            if (res.shipping) this.shipping.set(res.shipping); // 👈 autoselección si el backend ya decide
            },
            complete: () => this.loading.set(false)
        });
    }
    chooseShipping(opt: ShippingSel) { this.shipping.set(opt); }
    finalize() {
        const id = this.orderId();
        const ship = this.shipping();
        const buyer = this.form.getRawValue();
        if (!id || !ship) return;

        this.loading.set(true);

        this.api.finalize({
        orderId: id,
        items: this.items(),
        buyer,
        discountCode: buyer.discountCode || null,
        shipping: ship
        }).subscribe({
            next: ({ orderId, receiptUrl, share }) => {
                this.cart.clear();

                const params: Record<string,string> = { oid: orderId, r: receiptUrl };
                if (share?.waVendor) params['wav'] = share.waVendor;
                this.router.navigate(['thanks'], { queryParams: params, replaceUrl: true });
            },
            error: () => this.loading.set(false),
            complete: () => this.loading.set(false)
        });
    }

    backToShop(){
        this.router.navigate(['/'], { fragment: 'shopTop' });
    }
}
