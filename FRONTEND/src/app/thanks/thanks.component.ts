import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-thanks',
  imports: [CommonModule],
  templateUrl: './thanks.component.html',
  styleUrls: ['./thanks.component.scss']
})
export class ThanksComponent {
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    receiptUrl   = signal<string | null>(null);
    mailtoBuyer  = signal<string | null>(null);
    mailtoVendor = signal<string | null>(null);
    waVendor     = signal<string | null>(null);

    constructor() {
        const qp = this.route.snapshot.queryParamMap;

        const safeDecode = (v: string | null) => {
        if (!v) return null;
        try { return decodeURIComponent(v); } catch { return v; }
        };

        this.receiptUrl.set(safeDecode(qp.get('r')));
        this.mailtoBuyer.set(safeDecode(qp.get('mb')));
        this.mailtoVendor.set(safeDecode(qp.get('mv')));
        this.waVendor.set(safeDecode(qp.get('wav')));
    }

    openPdf(){ const u = this.receiptUrl(); if (u) window.open(u, '_blank'); }
    sendEmailBuyer(){ const m = this.mailtoBuyer(); if (m) window.location.href = m; }
    sendWhatsAppVendor(){ const w = this.waVendor(); if (w) window.open(w, '_blank'); }
    notifyVendorEmail(){ const m = this.mailtoVendor(); if (m) window.location.href = m; }
    backToShop(){ this.router.navigate(['/'], { fragment: 'shopTop' }); }
}
