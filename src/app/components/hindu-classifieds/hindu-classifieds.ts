import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HinduClassifiedsService, HinduClassifiedItem } from '../../services/hindu-classifieds.service';
import { RealtyService } from '../../services/realty.service';
import { ClassifiedParserService } from '../../services/classified-parser.service';
import { CHENNAI_LOCALITIES, ChennaiLocality, PropertyType, TransactionType } from '../../models/realty.model';

@Component({
  selector: 'app-hindu-classifieds',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hindu-classifieds.html',
  styleUrl: './hindu-classifieds.css'
})
export class HinduClassifiedsComponent {
  public classifiedsService = inject(HinduClassifiedsService);
  public realtyService = inject(RealtyService);
  public parserService = inject(ClassifiedParserService);

  public openScannerModal = output<void>();
  public viewProperty = output<string>();

  // User-Friendly Feed Source & Scraping
  public activeSource = signal<'property-plus' | 'chennai-corridors' | 'custom'>('property-plus');
  public showCustomLinkBar = signal<boolean>(false);
  public customScrapUrl = signal<string>('https://www.thehindu.com/real-estate/feeder/default.rss');
  public isScrapingUrl = signal<boolean>(false);

  // Modals
  public showAddModal = signal<boolean>(false);
  public isParsing = signal<boolean>(false);

  // New Classified Form
  public rawAdInput = signal<string>('');
  public newAdCategory = signal<'Seller' | 'Buyer'>('Seller');
  public newAdLocality = signal<ChennaiLocality>('OMR');
  public newAdSubLocation = signal<string>('');
  public newAdPropertyType = signal<PropertyType>('Apartment');
  public newAdTransaction = signal<TransactionType>('Sale');
  public newAdBhk = signal<number | string>(2);
  public newAdArea = signal<number>(1200);
  public newAdPriceLakhs = signal<number>(85);
  public newAdPriceDisplay = signal<string>('₹85 Lakhs');
  public newAdContactName = signal<string>('Owner');
  public newAdContactPhone = signal<string>('+91 98401 22334');
  public newAdFacing = signal<string>('East');
  public newAdApproval = signal<string>('CMDA approved');
  public newAdHeadline = signal<string>('');

  public localities = CHENNAI_LOCALITIES;

  public propertyTypes: PropertyType[] = [
    'Apartment',
    'Independent house',
    'Villa',
    'Builder floor',
    'Commercial',
    'Residential Plot',
    'Office',
    'Shop'
  ];

  public selectFeedSource(source: 'property-plus' | 'chennai-corridors' | 'custom'): void {
    this.activeSource.set(source);
    if (source === 'property-plus') {
      this.showCustomLinkBar.set(false);
      this.customScrapUrl.set('https://www.thehindu.com/real-estate/feeder/default.rss');
      this.classifiedsService.fetchLiveWebFeeds('https://www.thehindu.com/real-estate/feeder/default.rss');
    } else if (source === 'chennai-corridors') {
      this.showCustomLinkBar.set(false);
      this.customScrapUrl.set('https://www.thehindu.com/news/cities/chennai/feeder/default.rss');
      this.classifiedsService.fetchLiveWebFeeds('https://www.thehindu.com/news/cities/chennai/feeder/default.rss');
    } else {
      this.showCustomLinkBar.set(true);
    }
  }

  public async onScrapeLiveUrl(): Promise<void> {
    const url = this.customScrapUrl().trim();
    if (!url) {
      this.realtyService.notify('Please enter a valid website link to fetch.', 'info');
      return;
    }

    this.isScrapingUrl.set(true);
    try {
      if (url.includes('.rss') || url.includes('feeder')) {
        await this.classifiedsService.fetchLiveWebFeeds(url);
      } else {
        await this.classifiedsService.scrapeFromCustomUrl(url);
      }
    } finally {
      this.isScrapingUrl.set(false);
    }
  }

  public autoParseInput(): void {
    const text = this.rawAdInput().trim();
    if (!text) {
      this.realtyService.notify('Please paste some newspaper classified text to auto-parse.', 'info');
      return;
    }

    this.isParsing.set(true);
    try {
      const parsed = this.parserService.parseClassifiedText(text);
      this.newAdCategory.set(parsed.detectedType === 'seller' ? 'Seller' : 'Buyer');
      this.newAdLocality.set(parsed.locality);
      this.newAdSubLocation.set(parsed.subLocation || '');
      this.newAdPropertyType.set(parsed.propertyType);
      this.newAdTransaction.set(parsed.transactionType);
      this.newAdBhk.set(parsed.bhk);
      this.newAdArea.set(parsed.builtUpAreaSqFt);
      this.newAdPriceLakhs.set(parsed.priceLakhs);
      this.newAdPriceDisplay.set(parsed.priceDisplay);
      this.newAdContactName.set(parsed.contactName);
      this.newAdContactPhone.set(parsed.contactPhone);
      this.newAdFacing.set(parsed.facing || 'East');
      this.newAdApproval.set(parsed.approvalStatus || 'CMDA approved');
      this.newAdHeadline.set(parsed.title);

      this.realtyService.notify('Classified ad auto-parsed successfully! Review and submit.', 'success');
    } finally {
      this.isParsing.set(false);
    }
  }

  public submitNewClassified(): void {
    const raw = this.rawAdInput().trim();
    if (!raw) {
      this.realtyService.notify('Please enter or paste the classified ad text.', 'error');
      return;
    }

    this.classifiedsService.addClassified(raw, {
      category: this.newAdCategory(),
      locality: this.newAdLocality(),
      subLocation: this.newAdSubLocation(),
      propertyType: this.newAdPropertyType(),
      transactionType: this.newAdTransaction(),
      bhk: this.newAdBhk(),
      builtUpAreaSqFt: this.newAdArea(),
      priceLakhs: this.newAdPriceLakhs(),
      priceDisplay: this.newAdPriceDisplay() || `₹${this.newAdPriceLakhs()} Lakhs`,
      contactName: this.newAdContactName() || 'Newspaper Ad Contact',
      contactPhone: this.newAdContactPhone(),
      facing: this.newAdFacing(),
      approvalStatus: this.newAdApproval(),
      headline: this.newAdHeadline() || `${this.newAdBhk()} BHK ${this.newAdPropertyType()} in ${this.newAdLocality()}`
    });

    this.showAddModal.set(false);
    this.resetForm();
  }

  public resetForm(): void {
    this.rawAdInput.set('');
    this.newAdHeadline.set('');
    this.newAdSubLocation.set('');
  }

  public onImportToInventory(item: HinduClassifiedItem): void {
    this.classifiedsService.addPropertyToUs(item);
  }

  public onImportToBuyers(item: HinduClassifiedItem): void {
    this.classifiedsService.addBuyerToUs(item);
  }

  public copyClassified(item: HinduClassifiedItem): void {
    const text = item.paraphrasedPitch || `${item.headline}\n\nPrice: ${item.priceDisplay}\nContact: ${item.contactName} (${item.contactPhone})\n\nOriginal Text:\n"${item.rawText}"\n${item.sourceUrl ? 'Link: ' + item.sourceUrl : ''}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.realtyService.notify('Classified pitch copied to clipboard!', 'success');
      });
    }
  }

  public getWhatsAppUrl(phone: string, headline: string): string {
    const cleanDigits = phone.replace(/[^\d]/g, '');
    const num = cleanDigits.startsWith('91') ? cleanDigits : ('91' + cleanDigits.slice(-10));
    const msg = encodeURIComponent(`Hello, I saw your property listing in The Hindu: "${headline}". Is this property still available for sale/rent? — SkyPearl Realty Chennai`);
    return `https://wa.me/${num}?text=${msg}`;
  }
}
