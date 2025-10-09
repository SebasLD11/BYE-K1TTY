import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CartService } from '../services/cart.service';
import { CheckoutService, ShippingSel } from '../services/checkout.service';

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

    submitSummary() {
        if (!this.items().length || this.form.invalid) return;
        this.loading.set(true);
        const buyer = this.form.getRawValue();
        this.api.summary({ items: this.items(), buyer, discountCode: buyer.discountCode || null })
        .subscribe({
            next: res => { this.orderId.set(res.orderId); this.shippingOptions.set(res.shippingOptions || []); this.summary.set(res); },
            complete: () => this.loading.set(false)
        });
    }
    chooseShipping(opt: ShippingSel) { this.shipping.set(opt); }
    finalize() {
        const id = this.orderId(); const ship = this.shipping(); const buyer = this.form.getRawValue();
        if (!id || !ship) return;
        this.loading.set(true);
        this.api.finalize({ orderId: id, items: this.items(), buyer, discountCode: buyer.discountCode || null, shipping: ship })
        .subscribe({
            next: ({ receiptUrl, share }) => {
                this.cart.clear();
                // Abre el PDF
                window.open(receiptUrl, '_blank');

                // Si el navegador soporta compartir nativo
                if (navigator.share) {
                    navigator.share({ title: 'Recibo BYE K1TTY', text: 'Tu recibo de compra', url: receiptUrl }).catch(()=>{});
                }

                // Fallbacks sin credenciales: abrir correo y WhatsApp prellenados
                if (share?.mailto) window.location.href = share.mailto; // abre el cliente de correo del comprador
                if (share?.wa) window.open(share.wa, '_blank');         // abre chat con el vendedor
            },
            complete: () => this.loading.set(false)
        });
    }
}
