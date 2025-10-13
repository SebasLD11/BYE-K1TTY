import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CheckoutService } from '../services/checkout.service';

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
  private api    = inject(CheckoutService);

  oid          = signal<string | null>(null);
  receiptUrl   = signal<string | null>(null);
  mailtoBuyer  = signal<string | null>(null);
  mailtoVendor = signal<string | null>(null);
  waVendor     = signal<string | null>(null);

  // ✅ URL 100% compatible (convierte wa.me → api.whatsapp.com)
  waHref = signal<string | null>(null);

  sendingBuyer  = signal(false);
  sendingVendor = signal(false);

  constructor() {
    const qp = this.route.snapshot.queryParamMap;
    const val = (k:string) => qp.get(k);

    this.oid.set(val('oid'));
    this.receiptUrl.set(val('r'));
    this.mailtoBuyer.set(val('mb'));
    this.mailtoVendor.set(val('mv'));
    this.waVendor.set(val('wav'));

    const w = val('wav'); // puede venir como wa.me/...
    this.waVendor.set(w);

    // Normaliza a api.whatsapp.com
    if (w) {
      const m = w.match(/^https:\/\/wa\.me\/(\d+)\?text=(.+)$/i);
      this.waHref.set(m ? `https://api.whatsapp.com/send?phone=${m[1]}&text=${m[2]}` : w);
    }
  }

  openPdf(){ const u = this.receiptUrl(); if (u) window.open(u, '_blank'); }

  sendEmailBuyer(){
    const oid = this.route.snapshot.queryParamMap.get('oid');
    if (!oid) return;

    this.api.emailBuyer(oid).subscribe({
      next: () => alert('Email enviado al comprador.'),
      error: (err) => {
        if (err?.error?.code === 'email_service_unconfigured') {
          const m = this.mailtoBuyer(); if (m) window.location.href = m;
        } else {
          alert('No se pudo enviar el email (prueba el botón de email)');
        }
      }
    });
  }
  // (opcional) si quieres abrir en la misma pestaña en ciertos navegadores
  openWhatsAppSameTab(){
    const u = this.waHref(); if (!u) return;
    // abrir en la misma pestaña suele evitar bloqueos de popups
    window.location.href = u;
  }

  notifyVendorEmail(){
    const oid = this.route.snapshot.queryParamMap.get('oid');
    if (!oid) return;

    this.api.emailVendor(oid).subscribe({
      next: () => alert('Email enviado al vendedor.'),
      error: (err) => {
        if (err?.error?.code === 'email_service_unconfigured') {
          const m = this.mailtoVendor(); if (m) window.location.href = m;
        } else if (err?.error?.code === 'vendor_email_missing') {
          alert('Falta configurar VENDOR_EMAIL o FROM_EMAIL en el backend.');
        } else {
          alert('No se pudo enviar el email (prueba el botón alternativo)');
        }
      }
    });
  }

  backToShop(){ this.router.navigate(['/'], { fragment: 'shopTop' }); }
}
