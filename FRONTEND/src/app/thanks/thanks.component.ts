// src/app/thanks/thanks.component.ts
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

  oid        = signal<string | null>(null);
  receiptUrl = signal<string | null>(null);
  waVendor   = signal<string | null>(null);
  waHref     = signal<string | null>(null); // normalizado api.whatsapp.com

  constructor() {
    const qp = this.route.snapshot.queryParamMap;
    const v  = (k:string) => qp.get(k) || null;

    this.oid.set(v('oid'));
    this.receiptUrl.set(v('r'));

    // admite ?wav=... (y por compatibilidad ?wa=...)
    const w = v('wav') || v('wa') || '';
    this.waVendor.set(w);

    // normaliza wa.me → api.whatsapp.com
    const m = (w || '').match(/^https:\/\/wa\.me\/(\d+)\?text=(.+)$/i);
    this.waHref.set(m ? `https://api.whatsapp.com/send?phone=${m[1]}&text=${m[2]}` : (w || null));
  }

  openPdf() {
    const u = this.receiptUrl();
    if (u) window.open(u, '_blank');
  }

  openWhatsApp() {
    const u = this.waHref();
    if (u) window.location.href = u; // mismo tab = menos bloqueos popup
  }

  backToShop(){ this.router.navigate(['/'], { fragment: 'shopTop' }); }
}
