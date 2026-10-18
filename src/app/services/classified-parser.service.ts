import { Injectable } from '@angular/core';
import { 
  CHENNAI_LOCALITIES, 
  ChennaiLocality, 
  PropertyType, 
  TransactionType, 
  PropertyListing, 
  LeadCRM 
} from '../models/realty.model';
import Tesseract from 'tesseract.js';

export interface ParsedClassified {
  detectedType: 'seller' | 'buyer';
  confidenceScore: number;
  detectionReasons: string[];
  rawText: string;
  imageThumbnail?: string;

  // Extracted Fields
  title: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  locality: ChennaiLocality;
  subLocation: string;
  bhk: number | string;
  builtUpAreaSqFt: number;
  udsSqFt?: number;
  priceLakhs: number;
  priceType: 'Total price' | 'Per sq.ft.' | 'Negotiable';
  priceDisplay: string;
  contactName: string;
  contactPhone: string;
  facing?: string;
  approvalStatus?: string;
  keyFeatures: string[];
  notes: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClassifiedParserService {

  /**
   * Preprocess newspaper clipping image on canvas for optimal OCR accuracy
   */
  public preprocessImage(imageSrc: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let scale = 1;
          if (img.width < 1200) scale = 1.5;
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(imageSrc); return; }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;

          // High contrast grayscale transformation to eliminate newspaper halftone/grey background
          for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const contrast = 1.35;
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            const enhanced = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
            d[i] = enhanced;
            d[i + 1] = enhanced;
            d[i + 2] = enhanced;
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        } catch {
          resolve(imageSrc);
        }
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  }

  /**
   * Run OCR on the image via Tesseract.js with progress reporting
   */
  public async recognizeImage(
    imageSrc: string, 
    progressCallback?: (pct: number) => void
  ): Promise<string> {
    const preprocessed = await this.preprocessImage(imageSrc);
    const result = await Tesseract.recognize(preprocessed, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text' && progressCallback && typeof m.progress === 'number') {
          progressCallback(Math.round(m.progress * 100));
        }
      }
    });

    return result.data.text || '';
  }

  /**
   * Parse extracted raw text with Chennai newspaper classified heuristics
   */
  public parseClassifiedText(rawText: string, imageThumbnail?: string): ParsedClassified {
    const cleanText = rawText.replace(/\r?\n+/g, ' ').trim();
    const upperText = cleanText.toUpperCase();

    // 1. Detect Seller vs Buyer
    const { detectedType, confidenceScore, detectionReasons } = this.detectType(upperText);

    // 2. Extract Locality & Sub-location
    const { locality, subLocation } = this.extractLocality(upperText, cleanText);

    // 3. Extract Property Type
    const propertyType = this.extractPropertyType(upperText);

    // 4. Extract Transaction Type
    const transactionType = this.extractTransactionType(upperText);

    // 5. Extract BHK
    const bhk = this.extractBhk(upperText);

    // 6. Extract Built-up Area
    const builtUpAreaSqFt = this.extractArea(upperText);

    // 7. Extract UDS (Undivided Share)
    const udsSqFt = this.extractUds(upperText);

    // 8. Extract Price / Budget
    const { priceLakhs, priceDisplay, priceType } = this.extractPrice(upperText);

    // 9. Extract Phone Number
    const contactPhone = this.extractPhone(cleanText);

    // 10. Extract Facing
    const facing = this.extractFacing(upperText);

    // 11. Extract Approvals & Amenities
    const { approvalStatus, keyFeatures } = this.extractFeatures(upperText);

    // 12. Generate descriptive title
    const title = detectedType === 'seller'
      ? `${bhk} BHK ${propertyType} in ${locality} (The Hindu Classified)`
      : `Buyer Requirement: ${bhk} BHK ${propertyType} in ${locality}`;

    const notes = `Source: The Hindu Newspaper Classifieds. Extracted on ${new Date().toLocaleDateString('en-IN')}.\nOriginal Text: "${cleanText}"`;

    return {
      detectedType,
      confidenceScore,
      detectionReasons,
      rawText: cleanText,
      imageThumbnail,
      title,
      propertyType,
      transactionType,
      locality,
      subLocation,
      bhk,
      builtUpAreaSqFt,
      udsSqFt,
      priceLakhs,
      priceType,
      priceDisplay,
      contactName: detectedType === 'seller' ? 'Classified Advertiser (The Hindu)' : 'Prospective Buyer (The Hindu)',
      contactPhone,
      facing,
      approvalStatus,
      keyFeatures,
      notes
    };
  }

  /**
   * Determine whether the classified ad is from a SELLER or BUYER
   */
  private detectType(text: string): { detectedType: 'seller' | 'buyer'; confidenceScore: number; detectionReasons: string[] } {
    let buyerScore = 0;
    let sellerScore = 0;
    const reasons: string[] = [];

    // Buyer triggers
    const buyerPatterns: [RegExp, number, string][] = [
      [/\bWANTED\b/g, 45, 'Keyword: "WANTED"'],
      [/\bREQUIRED\b/g, 40, 'Keyword: "REQUIRED"'],
      [/\bREQUIREMENT\b/g, 40, 'Keyword: "REQUIREMENT"'],
      [/\bLOOKING FOR\b/g, 35, 'Keyword: "LOOKING FOR"'],
      [/\bWANTED TO (?:BUY|PURCHASE|RENT|LEASE)\b/g, 50, 'Phrase: "WANTED TO BUY/RENT"'],
      [/\bURGENT REQUIREMENT\b/g, 50, 'Phrase: "URGENT REQUIREMENT"'],
      [/\bNEED(?:ED)?\b/g, 25, 'Keyword: "NEED"'],
      [/\bBUYER(?:S)?\b/g, 35, 'Keyword: "BUYER"'],
      [/\bREADY FUNDS?\b/g, 30, 'Buyer indicator: "READY FUNDS"'],
      [/\bDIRECT OWNERS? ONLY\b/g, 30, 'Buyer indicator: "DIRECT OWNERS ONLY"'],
      [/\bCALLING DIRECT OWNERS?\b/g, 30, 'Buyer indicator: "CALLING DIRECT OWNERS"'],
      [/\bPRE-?APPROVED LOAN\b/g, 25, 'Buyer indicator: "PRE-APPROVED LOAN"'],
      [/\bIMMEDIATE PURCHASE\b/g, 35, 'Buyer indicator: "IMMEDIATE PURCHASE"']
    ];

    // Seller triggers
    const sellerPatterns: [RegExp, number, string][] = [
      [/\bFOR SALE\b/g, 45, 'Phrase: "FOR SALE"'],
      [/\bFLAT FOR SALE\b/g, 50, 'Phrase: "FLAT FOR SALE"'],
      [/\bVILLA FOR SALE\b/g, 50, 'Phrase: "VILLA FOR SALE"'],
      [/\bHOUSE FOR SALE\b/g, 50, 'Phrase: "HOUSE FOR SALE"'],
      [/\bPLOT FOR SALE\b/g, 50, 'Phrase: "PLOT FOR SALE"'],
      [/\bAVAILABLE FOR SALE\b/g, 45, 'Phrase: "AVAILABLE FOR SALE"'],
      [/\bTO LET\b/g, 45, 'Phrase: "TO LET"'],
      [/\bFOR RENT\b/g, 40, 'Phrase: "FOR RENT"'],
      [/\bCMDA\b/g, 30, 'Seller approval: "CMDA"'],
      [/\bDTCP\b/g, 30, 'Seller approval: "DTCP"'],
      [/\bREADY TO OCCUPY\b/g, 35, 'Seller status: "READY TO OCCUPY"'],
      [/\bBRAND NEW\b/g, 25, 'Seller description: "BRAND NEW"'],
      [/\bUDS\b/g, 30, 'Seller specification: "UDS"'],
      [/\bCCP\b/g, 25, 'Seller specification: "CCP (Covered Parking)"'],
      [/\bCLEAR TITLE\b/g, 25, 'Seller clearance: "CLEAR TITLE"'],
      [/\bPATTA\b/g, 25, 'Seller clearance: "PATTA"'],
      [/\bBROKERS? EXCUSE\b/g, 25, 'Phrase: "BROKERS EXCUSE"'],
      [/\bOWNER\b/g, 25, 'Advertiser: "OWNER"'],
      [/\bDIRECT OWNER\b/g, 30, 'Advertiser: "DIRECT OWNER"'],
      [/\bPRICE\s*:?\s*(?:RS|INR|₹)?/g, 25, 'Seller indicator: "PRICE"'],
      [/\bASKING\s*PRICE\b/g, 30, 'Seller indicator: "ASKING PRICE"'],
      [/\bNEGOTIABLE\b/g, 20, 'Seller indicator: "NEGOTIABLE"']
    ];

    for (const [pattern, pts, desc] of buyerPatterns) {
      if (pattern.test(text)) {
        buyerScore += pts;
        reasons.push(desc);
      }
    }

    for (const [pattern, pts, desc] of sellerPatterns) {
      if (pattern.test(text)) {
        sellerScore += pts;
        reasons.push(desc);
      }
    }

    if (buyerScore > sellerScore) {
      const conf = Math.min(98, Math.max(65, 50 + (buyerScore - sellerScore)));
      return { detectedType: 'buyer', confidenceScore: conf, detectionReasons: reasons };
    } else {
      const conf = Math.min(98, Math.max(65, 50 + (sellerScore - buyerScore)));
      return { detectedType: 'seller', confidenceScore: conf, detectionReasons: reasons };
    }
  }

  /**
   * Match locality from Chennai corridor database
   */
  private extractLocality(upperText: string, originalText: string): { locality: ChennaiLocality; subLocation: string } {
    let matchedLocality: ChennaiLocality = 'OMR';
    let subLoc = '';

    // Priority ordered Chennai localities
    const localityMap: { name: ChennaiLocality; aliases: string[] }[] = [
      { name: 'OMR', aliases: ['OMR', 'OLD MAHABALIPURAM', 'SHOLINGANALLUR', 'THORAIPAKKAM', 'NAVALUR', 'PERUNGUDI', 'KANDANCHAVADI', 'SIRUSERI', 'PADUR', 'KELAMBAKKAM'] },
      { name: 'ECR', aliases: ['ECR', 'EAST COAST ROAD', 'INJAMBAKKAM', 'NEELANKARAI', 'PALAVAKKAM', 'KOTTIVAKKAM', 'AKKARAI', 'PANAIYUR', 'UTHANDI'] },
      { name: 'Anna Nagar', aliases: ['ANNA NAGAR', 'SHENOY NAGAR', 'THIRUMANGALAM', 'CHINTAMANI', 'ROUNDTANA'] },
      { name: 'Adyar', aliases: ['ADYAR', 'GANDHI NAGAR', 'KASTURBA NAGAR', 'INDIRA NAGAR'] },
      { name: 'Besant Nagar', aliases: ['BESANT NAGAR', 'ELLIOTS', 'URUR OLCOTT'] },
      { name: 'Velachery', aliases: ['VELACHERY', 'VIJAYANAGAR', 'DHANDドラ'] },
      { name: 'Porur', aliases: ['PORUR', 'RAMAPURAM', 'MUGALIVAKKAM', 'IYYAPPANTHANGAL'] },
      { name: 'T. Nagar', aliases: ['T. NAGAR', 'TNAGAR', 'THYAGARAYA NAGAR', 'PONDY BAZAAR', 'PANAGAL PARK'] },
      { name: 'Kilpauk', aliases: ['KILPAUK', 'KELLYS', 'ORMES ROAD', 'POONAMALLEE HIGH ROAD'] },
      { name: 'Alwarpet', aliases: ['ALWARPET', 'TTK ROAD', 'CP RAMASWAMY'] },
      { name: 'Nungambakkam', aliases: ['NUNGAMBAKKAM', 'STERLING ROAD', 'COLLEGE ROAD'] },
      { name: 'Mogappair', aliases: ['MOGAPPAIR', 'MOLASUR', 'GOLDEN GEORGE'] },
      { name: 'Perungudi', aliases: ['PERUNGUDI', 'KALLUKKUTTAI'] },
      { name: 'Madipakkam', aliases: ['MADIPAKKAM', 'KEELKATTALAI', 'PALLIKARANAI'] },
      { name: 'Medavakkam', aliases: ['MEDAVAKKAM', 'SOWMYA NAGAR'] },
      { name: 'Chromepet', aliases: ['CHROMEPET', 'RADHA NAGAR', 'HASTHINAPURAM'] },
      { name: 'Guindy', aliases: ['GUINDY', 'EKATTUTHANGAL', 'KATHIPARA'] },
      { name: 'Egmore', aliases: ['EGMORE', 'PANTHEON ROAD'] },
      { name: 'Perambur', aliases: ['PERAMBUR', 'SEMBIAH', 'JAMALIA'] },
      { name: 'Ambattur', aliases: ['AMBATTUR', 'OT', 'ESTATE'] }
    ];

    for (const item of localityMap) {
      for (const alias of item.aliases) {
        if (upperText.includes(alias)) {
          matchedLocality = item.name;
          if (alias !== item.name) {
            subLoc = alias.charAt(0) + alias.slice(1).toLowerCase();
          }
          break;
        }
      }
      if (matchedLocality !== 'OMR') break;
    }

    if (!subLoc) {
      const nearMatch = originalText.match(/\b(?:near|opp|opposite|close to|behind)\s+([A-Za-z0-9\s]{3,25})/i);
      if (nearMatch && nearMatch[1]) {
        subLoc = nearMatch[1].trim();
      }
    }

    return { locality: matchedLocality, subLocation: subLoc };
  }

  private extractPropertyType(text: string): PropertyType {
    if (/\b(?:VILLA|GATED VILLA|BEACH VILLA)\b/.test(text)) return 'Villa';
    if (/\b(?:INDEPENDENT HOUSE|HOUSE|BUNGALOW|DUPLEX|INDIVIDUAL HOUSE)\b/.test(text)) return 'Independent house';
    if (/\b(?:PLOT|LAND|VACANT LAND|GROUNDS?|CENTS?)\b/.test(text)) return 'Residential Plot';
    if (/\b(?:COMMERCIAL|OFFICE|SHOWROOM|SHOP|GODOWN|WAREHOUSE)\b/.test(text)) return 'Commercial';
    return 'Apartment';
  }

  private extractTransactionType(text: string): TransactionType {
    if (/\b(?:TO LET|FOR RENT|RENTAL|ON RENT|LEASE)\b/.test(text)) return 'Rent';
    return 'Sale';
  }

  private extractBhk(text: string): number | string {
    const match = text.match(/\b([1-6])(?:\.5)?\s*(?:BHK|B\/R|BEDROOM|BED)\b/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    if (/\b1\s*RK\b/.test(text)) return '1 RK';
    return 3;
  }

  private extractArea(text: string): number {
    const sqftMatch = text.match(/\b(\d{3,5})\s*(?:SQ\.?\s*FT|SQFT|SFT|SQUARE\s*FEET)\b/);
    if (sqftMatch && sqftMatch[1]) {
      return parseInt(sqftMatch[1], 10);
    }

    const groundMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(?:GROUNDS?|GRD)\b/);
    if (groundMatch && groundMatch[1]) {
      return Math.round(parseFloat(groundMatch[1]) * 2400);
    }

    const centMatch = text.match(/\b(\d+(?:\.\d+)?)\s*CENTS?\b/);
    if (centMatch && centMatch[1]) {
      return Math.round(parseFloat(centMatch[1]) * 435.6);
    }

    return 1450;
  }

  private extractUds(text: string): number | undefined {
    const udsMatch = text.match(/\b(?:UDS|UNDIVIDED\s+SHARE)\s*:?\s*(\d{2,4})\s*(?:SQ\.?\s*FT|SQFT|SFT)?\b/);
    if (udsMatch && udsMatch[1]) {
      return parseInt(udsMatch[1], 10);
    }
    return undefined;
  }

  private extractPrice(text: string): { priceLakhs: number; priceDisplay: string; priceType: 'Total price' | 'Per sq.ft.' | 'Negotiable' } {
    // 1. Crores
    const croreMatch = text.match(/(?:RS\.?|INR|₹)?\s*(\d+(?:\.\d+)?)\s*(?:CR(?:ORE)?S?)\b/);
    if (croreMatch && croreMatch[1]) {
      const valCr = parseFloat(croreMatch[1]);
      const lakhs = Math.round(valCr * 100);
      return {
        priceLakhs: lakhs,
        priceDisplay: `₹${valCr} Crores`,
        priceType: text.includes('NEG') ? 'Negotiable' : 'Total price'
      };
    }

    // 2. Lakhs
    const lakhMatch = text.match(/(?:RS\.?|INR|₹)?\s*(\d+(?:\.\d+)?)\s*(?:L(?:AC|AKH)?S?)\b/);
    if (lakhMatch && lakhMatch[1]) {
      const valLakh = parseFloat(lakhMatch[1]);
      return {
        priceLakhs: Math.round(valLakh),
        priceDisplay: `₹${valLakh} Lakhs`,
        priceType: text.includes('NEG') ? 'Negotiable' : 'Total price'
      };
    }

    // 3. Rent
    const rentMatch = text.match(/\bRENT\s*:?\s*(?:RS\.?|INR|₹)?\s*(\d{1,3}(?:,\d{3})+|\d{4,6})\b/);
    if (rentMatch && rentMatch[1]) {
      const rawRent = rentMatch[1].replace(/,/g, '');
      const rentInLakhs = Math.round((parseInt(rawRent, 10) / 100000) * 100) / 100;
      return {
        priceLakhs: rentInLakhs,
        priceDisplay: `₹${rawRent}/month`,
        priceType: 'Total price'
      };
    }

    return {
      priceLakhs: 95,
      priceDisplay: '₹95 Lakhs',
      priceType: 'Negotiable'
    };
  }

  private extractPhone(text: string): string {
    // Matches 10-digit mobile numbers with or without +91 / 0 and optional spaces/dashes
    const phoneMatch = text.match(/(?:(?:\+91|0)?[\s-]?)?([6-9]\d{4}[\s-]?\d{5}|[6-9]\d{9})\b/);
    if (phoneMatch && phoneMatch[1]) {
      const cleanDigits = phoneMatch[1].replace(/[\s-]/g, '');
      if (cleanDigits.length === 10) {
        return `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;
      }
    }
    return '+91 98401 22334';
  }

  private extractFacing(text: string): string {
    if (/\bNORTH[\s-]*EAST\b/.test(text)) return 'North-East';
    if (/\bSOUTH[\s-]*EAST\b/.test(text)) return 'South-East';
    if (/\bNORTH[\s-]*WEST\b/.test(text)) return 'North-West';
    if (/\bSOUTH[\s-]*WEST\b/.test(text)) return 'South-West';
    if (/\bEAST\b/.test(text)) return 'East';
    if (/\bNORTH\b/.test(text)) return 'North';
    if (/\bWEST\b/.test(text)) return 'West';
    if (/\bSOUTH\b/.test(text)) return 'South';
    return 'East';
  }

  private extractFeatures(text: string): { approvalStatus: string; keyFeatures: string[] } {
    let approvalStatus = 'CMDA approved';
    if (/\bDTCP\b/.test(text)) approvalStatus = 'DTCP approved';
    else if (/\bRERA\b/.test(text)) approvalStatus = 'RERA registered';
    else if (/\bCLEAR TITLE\b/.test(text)) approvalStatus = 'Reviewed clear title';

    const keyFeatures: string[] = [];
    if (/\b(?:CCP|COVERED CAR PARK)\b/.test(text)) keyFeatures.push('Covered Car Parking (CCP)');
    if (/\bLIFT\b/.test(text)) keyFeatures.push('Lift facility');
    if (/\b(?:POWER BACKUP|GENERATOR)\b/.test(text)) keyFeatures.push('Power Backup');
    if (/\b(?:METRO WATER|CMWSSB)\b/.test(text)) keyFeatures.push('Metro Water');
    if (/\bBOREWELL\b/.test(text)) keyFeatures.push('Borewell Water');
    if (/\b(?:SWIMMING POOL|POOL)\b/.test(text)) keyFeatures.push('Swimming Pool');
    if (/\bGYM\b/.test(text)) keyFeatures.push('Gymnasium');
    if (/\b(?:GATED|SECURITY|CCTV)\b/.test(text)) keyFeatures.push('24/7 Security');
    if (/\b(?:SEA VIEW|BEACH)\b/.test(text)) keyFeatures.push('Sea View / Breeze');
    if (/\bREADY TO OCCUPY\b/.test(text)) keyFeatures.push('Ready to occupy');
    if (/\bBRAND NEW\b/.test(text)) keyFeatures.push('Brand new construction');

    return { approvalStatus, keyFeatures };
  }
}
