import { Injectable, signal, inject } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { LeadCRM, PropertyListing } from '../models/realty.model';
import { collection, addDoc } from 'firebase/firestore';

export interface EmailAutomationSettings {
  provider: 'emailjs' | 'mailto' | 'firebase';
  emailjsServiceId: string;
  emailjsTemplateId: string;
  emailjsPublicKey: string;
  senderName: string;
  senderEmail: string;
  autoLogFollowUp: boolean;
}

const STORAGE_KEY_EMAIL_CONFIG = 'skypearl_email_automation_config_v1';

const DEFAULT_EMAIL_SETTINGS: EmailAutomationSettings = {
  provider: 'mailto',
  emailjsServiceId: '',
  emailjsTemplateId: '',
  emailjsPublicKey: '',
  senderName: 'SkyPearl Realty Advisors',
  senderEmail: 'chennai-realty@skypearl.space',
  autoLogFollowUp: true
};

export type FollowUpTemplateType = 'property_matches' | 'site_visit' | 'negotiation' | 'check_in';

@Injectable({
  providedIn: 'root'
})
export class EmailFollowupService {
  private firebaseService = inject(FirebaseService);

  public readonly emailSettings = signal<EmailAutomationSettings>(this.loadSettings());
  public readonly isSending = signal<boolean>(false);
  public readonly lastSendStatus = signal<{ success: boolean; message: string } | null>(null);

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): EmailAutomationSettings {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_EMAIL_SETTINGS };
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EMAIL_CONFIG);
      if (saved) {
        return { ...DEFAULT_EMAIL_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {}
    return { ...DEFAULT_EMAIL_SETTINGS };
  }

  public saveSettings(settings: EmailAutomationSettings): void {
    this.emailSettings.set(settings);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_EMAIL_CONFIG, JSON.stringify(settings));
    }
  }

  public hasValidEmailJsKeys(): boolean {
    const s = this.emailSettings();
    return Boolean(
      s.emailjsServiceId && s.emailjsServiceId.trim().length > 3 &&
      s.emailjsTemplateId && s.emailjsTemplateId.trim().length > 3 &&
      s.emailjsPublicKey && s.emailjsPublicKey.trim().length > 3
    );
  }

  /**
   * Generates context-rich real estate follow-up email drafts
   */
  public generateEmailDraft(
    templateType: FollowUpTemplateType,
    lead: LeadCRM,
    matches: PropertyListing[] = [],
    agentName: string = 'SkyPearl Realty Advisor'
  ): { subject: string; body: string } {
    const clientName = lead.name || 'Valued Client';
    const localities = lead.preferredLocalities && lead.preferredLocalities.length > 0
      ? lead.preferredLocalities.join(', ')
      : 'prime Chennai corridors';
    const bhk = lead.preferredBhk ? `${lead.preferredBhk} BHK` : 'Residential';
    const budgetRange = `₹${lead.budgetMinLakhs}L–₹${lead.budgetMaxLakhs}L`;

    switch (templateType) {
      case 'property_matches': {
        const subject = `SkyPearl Realty: Handpicked ${bhk} Properties in ${localities} for ${clientName}`;
        let matchesList = '';
        if (matches.length > 0) {
          matchesList = matches.slice(0, 3).map((p, i) => {
            const price = p.priceLakhs >= 100 ? `₹${(p.priceLakhs / 100).toFixed(2)} Cr` : `₹${p.priceLakhs} Lakhs`;
            const area = p.builtUpAreaSqFt ? `${p.builtUpAreaSqFt} sq.ft` : '';
            const uds = p.udsSqFt ? `(UDS: ${p.udsSqFt} sq.ft)` : '';
            return `${i + 1}. ${p.title} (${p.locality})\n   • Price: ${price} | ${p.bhk} BHK | ${area} ${uds}\n   • Approval: ${p.approvalAuthority || 'CMDA Approved'}\n   • Ready to Visit: Weekends or on-demand\n`;
          }).join('\n');
        } else {
          matchesList = `• Verified properties matching your criteria in ${localities} within ${budgetRange}.\n• Clear CMDA/DTCP titles and legally vetted documentation.\n`;
        }

        const body = `Dear ${clientName},

Thank you for connecting with SkyPearl Realty.

Based on your requirement for a ${bhk} property in ${localities} (Budget: ${budgetRange}), we have curated the following high-compatibility verified options for you:

${matchesList}
Would you be available for an exclusive site visit this weekend? Please let us know your preferred day and time, and we will arrange access.

Warm regards,
${agentName}
SkyPearl Realty Advisors · Chennai
Phone / WhatsApp: ${lead.phone ? 'Direct connect available' : '+91 98401 22334'}
Email: ${this.emailSettings().senderEmail}`;
        return { subject, body };
      }

      case 'site_visit': {
        const subject = `Site Visit Confirmation & Directions · ${bhk} in ${localities} · SkyPearl Realty`;
        const body = `Dear ${clientName},

This is a follow-up regarding your upcoming site visit for the ${bhk} properties in ${localities}.

Site Visit Checklist:
• Location: ${localities}, Chennai
• Property Category: ${lead.preferredPropertyType || 'Apartment'}
• Timing: As per your convenience (Morning: 10:30 AM–1:00 PM / Afternoon: 3:30 PM–6:00 PM)
• Legal Records: Parent title deeds, approved CMDA plan & Patta copies available for inspection on-site.

Kindly confirm your availability so our local Chennai area specialist can meet you directly at the location.

Looking forward to assisting you,
${agentName}
SkyPearl Realty Advisors · Chennai`;
        return { subject, body };
      }

      case 'negotiation': {
        const subject = `Price Negotiation & Terms Update for ${clientName} · SkyPearl Realty`;
        const body = `Dear ${clientName},

Following up on our discussions regarding the ${bhk} property in ${localities}:

We have spoken with the seller/developer regarding your target budget bracket (${budgetRange}). 

Key Updates:
1. Seller Pricing: Open to structured negotiation for serious buyers with immediate funding readiness.
2. Home Loan Pre-Clearance: Major banks (SBI, HDFC, ICICI) have approved the project with expedited processing.
3. Documentation: Encumbrance Certificate (EC) for 30 years is clean and ready for legal verification.

Please let us know when we can arrange a brief discussion to finalize the offer terms.

Best regards,
${agentName}
SkyPearl Realty Advisors · Chennai`;
        return { subject, body };
      }

      case 'check_in':
      default: {
        const subject = `Touching Base: Your Property Search in ${localities} · SkyPearl Realty`;
        const body = `Dear ${clientName},

I hope you are having a wonderful week.

I am checking in to see if you are still looking for a ${bhk} ${lead.preferredPropertyType || 'property'} in ${localities} within the ${budgetRange} range.

Several new developer and resale listings in Chennai have recently come onto our radar that closely align with your criteria. If you have updated your preferences or timeline, please reply to this email or send a quick WhatsApp message.

Always glad to assist,
${agentName}
SkyPearl Realty Advisors · Chennai`;
        return { subject, body };
      }
    }
  }

  /**
   * 1-Click Native Mail Client (Zero Keys Required)
   * Opens user's default email client (Gmail, Outlook, Apple Mail) with prefilled to, subject, and body.
   */
  public openNativeEmailClient(toEmail: string, subject: string, body: string): boolean {
    const cleanEmail = toEmail ? toEmail.trim() : '';
    const mailtoUrl = `mailto:${encodeURIComponent(cleanEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    if (typeof window !== 'undefined') {
      const link = document.createElement('a');
      link.href = mailtoUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    }
    return false;
  }

  /**
   * Automated Background Email Dispatch via EmailJS REST API
   * Requires EmailJS public key, service ID, and template ID.
   */
  public async sendViaEmailJs(
    toEmail: string,
    toName: string,
    subject: string,
    body: string,
    agentName: string
  ): Promise<{ success: boolean; message: string }> {
    const config = this.emailSettings();
    if (!this.hasValidEmailJsKeys()) {
      return {
        success: false,
        message: 'EmailJS keys are missing. Please enter your Service ID, Template ID, and Public Key in Email Settings, or use the 1-Click Email Client option.'
      };
    }

    this.isSending.set(true);
    this.lastSendStatus.set(null);

    try {
      const payload = {
        service_id: config.emailjsServiceId.trim(),
        template_id: config.emailjsTemplateId.trim(),
        user_id: config.emailjsPublicKey.trim(),
        template_params: {
          to_email: toEmail,
          to_name: toName || 'Client',
          subject: subject,
          message: body,
          from_name: agentName || config.senderName,
          reply_to: config.senderEmail
        }
      };

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const msg = `Automated follow-up email successfully delivered to ${toEmail}!`;
        this.lastSendStatus.set({ success: true, message: msg });
        return { success: true, message: msg };
      } else {
        const errText = await response.text();
        const msg = `EmailJS delivery error (${response.status}): ${errText || 'Invalid credentials'}`;
        this.lastSendStatus.set({ success: false, message: msg });
        return { success: false, message: msg };
      }
    } catch (err: any) {
      const msg = `Network failed when contacting EmailJS: ${err.message || 'Check internet connection'}`;
      this.lastSendStatus.set({ success: false, message: msg });
      return { success: false, message: msg };
    } finally {
      this.isSending.set(false);
    }
  }

  /**
   * Automated Firebase Firestore Trigger Email
   * Writes a document to 'mail' collection for Firebase Trigger Email extension
   */
  public async sendViaFirebaseMailCollection(
    toEmail: string,
    subject: string,
    body: string
  ): Promise<{ success: boolean; message: string }> {
    if (!this.firebaseService.firestore || this.firebaseService.isDemoMode()) {
      return {
        success: false,
        message: 'Firebase Firestore is not initialized. Please connect Firebase to use Cloud Mail Queue.'
      };
    }

    try {
      const db = this.firebaseService.firestore;
      const mailCol = collection(db, 'mail');
      await addDoc(mailCol, {
        to: [toEmail],
        message: {
          subject: subject,
          text: body,
          html: body.replace(/\n/g, '<br/>')
        },
        createdAt: Date.now()
      });

      return {
        success: true,
        message: 'Email queued in Firestore /mail collection for automated dispatch via Firebase Extension.'
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Firestore mail queue error: ${err.message}`
      };
    }
  }
}
