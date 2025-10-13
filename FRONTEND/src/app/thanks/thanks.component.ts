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
  }

  openPdf(){ const u = this.receiptUrl(); if (u) window.open(u, '_blank'); }

  sendEmailBuyer(){
    const orderId = this.route.snapshot.queryParamMap.get('oid');
    // Si tienes un servicio con api.emailBuyer:
    this.api.emailBuyer(orderId!).subscribe({
      next: () => alert('Recibo enviado por email.'),
      error: (err) => {
        // Fallback automático a mailto si el backend no tiene SMTP
        if (err?.error?.code === 'email_service_unconfigured' || err.status === 400) {
          const m = this.mailtoBuyer();
          if (m) window.location.href = m;
        } else {
          alert('No se pudo enviar el email (intenta de nuevo o usa el botón de email).');
        }
      }
    });
  }

  sendWhatsAppVendor(){ const w = this.waVendor(); if (w) window.open(w, '_blank'); }

  notifyVendorEmail(){
    const id = this.oid(); if (!id) return;
    this.sendingVendor.set(true);
    this.api.emailVendor(id).subscribe({
      next: () => alert('Notificación enviada al vendedor.'),
      error: () => { const m = this.mailtoVendor(); if (m) window.location.href = m; },
      complete: () => this.sendingVendor.set(false)
    });
  }

  backToShop(){ this.router.navigate(['/'], { fragment: 'shopTop' }); }
}
