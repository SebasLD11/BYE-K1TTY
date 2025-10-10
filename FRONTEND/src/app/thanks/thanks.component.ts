import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-thanks',
  imports: [CommonModule],
  templateUrl: './thanks.component.html',
  styleUrls: ['./thanks.component.scss']
})
export class ThanksComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  receiptUrl   = signal<string | null>(null);
  mailtoBuyer  = signal<string | null>(null);
  mailtoVendor = signal<string | null>(null);
  waVendor     = signal<string | null>(null);

  constructor(){
    // 1) Preferimos state (viene de finalize)
    const st = this.router.getCurrentNavigation()?.extras?.state as any;
    // 2) Fallback a query params
    const qp = this.route.snapshot.queryParamMap;

    const r   = decodeURIComponent(st?.receiptUrl || qp.get('r')   || '') || null;
    const mb  = decodeURIComponent(st?.mailtoBuyer || qp.get('mb') || '') || null;
    const mv  = decodeURIComponent(st?.mailtoVendor|| qp.get('mv') || '') || null;
    const wav = decodeURIComponent(st?.waVendor    || qp.get('wav')|| '') || null;

    this.receiptUrl.set(r);
    this.mailtoBuyer.set(mb);
    this.mailtoVendor.set(mv);
    this.waVendor.set(wav);

    // 3) Persistimos por si se recarga
    try {
      sessionStorage.setItem('bk-last-receipt', JSON.stringify({ r, mb, mv, wav }));
    } catch {}
    // 4) Si todavía faltara, intentamos recuperar de sesión
    if (!this.receiptUrl()) {
      try {
        const raw = sessionStorage.getItem('bk-last-receipt');
        if (raw) {
          const s = JSON.parse(raw);
          this.receiptUrl.set(s.r || null);
          this.mailtoBuyer.set(s.mb || null);
          this.mailtoVendor.set(s.mv || null);
          this.waVendor.set(s.wav || null);
        }
      } catch {}
    }
  }

  openPdf(){ const u = this.receiptUrl(); if (u) window.open(u, '_blank'); }
  sendEmailBuyer(){ const m = this.mailtoBuyer(); if (m) window.location.href = m; }   // CTA “Email comprador”
  sendWhatsAppVendor(){ const w = this.waVendor(); if (w) window.open(w, '_blank'); }  // CTA “WhatsApp vendedor”
  // (opcional) Notificar vendedor por email:
  notifyVendorEmail(){ const m = this.mailtoVendor(); if (m) window.location.href = m; }

  backToShop(){ this.router.navigate(['/'], { fragment: 'shopTop' }); }
}
