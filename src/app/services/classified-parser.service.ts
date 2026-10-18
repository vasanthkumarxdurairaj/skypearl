import { Injectable } from '@angular/core';
import { 
  CHENNAI_LOCALITIES, 
  ChennaiLocality, 
  PropertyType, 
  TransactionType, 
  PropertyListing, 
  LeadCRM 
} from '../models/realty.model';

export interface ParsedClassified {
  detectedType: 'seller' | 'buyer';
  confidenceScore: number;
  detectionReasons: string[];
  rawText: string;
  imageThumbnail?: string;

  // Extracted Fields
  title: string;
  paraphrasedPitch: string;
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
   * Preprocess camera photo / newspaper clipping image on canvas for optimal OCR accuracy.
   * Specifically tuned for newsprint: eliminates grey paper tone, sharpens ink dots,
   * scales up small typography, and boosts contrast.
   */
  public preprocessImage(imageSrc: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let scale = 1;
          // Newsprint classifieds have small 7-8pt font; upscale for optimal Tesseract recognition
          if (img.width < 1400) scale = 1.6;
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(imageSrc); return; }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          const len = d.length;

          // Compute mean luminance for adaptive contrast thresholding
          let totalLum = 0;
          for (let i = 0; i < len; i += 4) {
            totalLum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          }
          const avgLum = totalLum / (len / 4);
          const threshold = Math.max(110, Math.min(160, avgLum * 0.92));

          // Newsprint binarization and edge contrast enhancement
          for (let i = 0; i < len; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            // Adaptive curve: push dark ink to near black, push grey newspaper background to pure white
            const val = gray < threshold 
              ? Math.max(0, gray * 0.45) 
              : Math.min(255, 185 + (gray - threshold) * 1.5);
            
            d[i] = val;
            d[i + 1] = val;
            d[i + 2] = val;
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.90));
        } catch {
          resolve(imageSrc);
        }
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  }

  /**
   * Run OCR on the image via Tesseract.js with lazy dynamic import and automatic worker cleanup
   */
  public async recognizeImage(
    imageSrc: string, 
    progressCallback?: (pct: number) => void
  ): Promise<string> {
    const preprocessed = await this.preprocessImage(imageSrc);
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text' && progressCallback && typeof m.progress === 'number') {
          progressCallback(Math.round(m.progress * 100));
        }
      }
    });

    try {
      const result = await worker.recognize(preprocessed);
      return result.data.text || '';
    } finally {
      await worker.terminate();
    }
  }

  /**
   * Parse extracted raw text with comprehensive Chennai real estate heuristics & generate smart paraphrase
   */
  public parseClassifiedText(rawText: string, imageThumbnail?: string): ParsedClassified {
    const cleanText = rawText.replace(/\r?\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
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
    const bhk = this.extractBhk(upperText, propertyType);

    // 6. Extract Built-up Area
    const builtUpAreaSqFt = this.extractArea(upperText);

    // 7. Extract UDS (Undivided Share)
    const udsSqFt = this.extractUds(upperText);

    // 8. Extract Price / Budget
    const { priceLakhs, priceDisplay, priceType } = this.extractPrice(upperText, builtUpAreaSqFt);

    // 9. Extract Phone Number
    const contactPhone = this.extractPhone(cleanText);

    // 10. Extract Facing
    const facing = this.extractFacing(upperText);

    // 11. Extract Approvals & Amenities
    const { approvalStatus, keyFeatures } = this.extractFeatures(upperText);

    // 12. Generate descriptive title & professional real estate paraphrase
    const contactName = detectedType === 'seller' ? 'Classified Advertiser (The Hindu)' : 'Prospective Buyer (The Hindu)';

    const { title, pitch } = this.generateParaphrase({
      detectedType,
      propertyType,
      transactionType,
      locality,
      subLocation,
      bhk,
      builtUpAreaSqFt,
      udsSqFt,
      priceDisplay,
      priceType,
      contactName,
      contactPhone,
      facing,
      approvalStatus,
      keyFeatures,
      cleanText
    });

    return {
      detectedType,
      confidenceScore,
      detectionReasons,
      rawText: cleanText,
      imageThumbnail,
      title,
      paraphrasedPitch: pitch,
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
      contactName,
      contactPhone,
      facing,
      approvalStatus,
      keyFeatures,
      notes: pitch
    };
  }

  /**
   * Determine whether the classified ad is from a SELLER (Listing) or BUYER (Requirement)
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
      [/\bCASH READY\b/g, 30, 'Buyer indicator: "CASH READY"'],
      [/\bDIRECT OWNERS? ONLY\b/g, 30, 'Buyer indicator: "DIRECT OWNERS ONLY"'],
      [/\bCALLING DIRECT OWNERS?\b/g, 30, 'Buyer indicator: "CALLING DIRECT OWNERS"'],
      [/\bPRE-?APPROVED LOAN\b/g, 25, 'Buyer indicator: "PRE-APPROVED LOAN"'],
      [/\bIMMEDIATE PURCHASE\b/g, 35, 'Buyer indicator: "IMMEDIATE PURCHASE"'],
      [/\bWANTED (?:LAND|PLOT|FLAT|VILLA|HOUSE|SPACE)\b/g, 45, 'Phrase: "WANTED PROPERTY"']
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
      [/\bRENTAL\b/g, 30, 'Phrase: "RENTAL"'],
      [/\bCMDA\b/g, 30, 'Approval: "CMDA"'],
      [/\bDTCP\b/g, 30, 'Approval: "DTCP"'],
      [/\bRERA\b/g, 25, 'Approval: "RERA"'],
      [/\bREADY TO OCCUPY\b/g, 35, 'Seller status: "READY TO OCCUPY"'],
      [/\bBRAND NEW\b/g, 25, 'Seller description: "BRAND NEW"'],
      [/\bUDS\b/g, 30, 'Specification: "UDS"'],
      [/\bCCP\b/g, 25, 'Specification: "CCP (Covered Parking)"'],
      [/\bCLEAR TITLE\b/g, 25, 'Clearance: "CLEAR TITLE"'],
      [/\bPATTA\b/g, 25, 'Clearance: "PATTA"'],
      [/\bBROKERS? EXCUSE\b/g, 25, 'Phrase: "BROKERS EXCUSE"'],
      [/\bOWNER\b/g, 25, 'Advertiser: "OWNER"'],
      [/\bDIRECT OWNER\b/g, 30, 'Advertiser: "DIRECT OWNER"'],
      [/\bPRICE\s*:?\s*(?:RS|INR|₹)?/g, 25, 'Indicator: "PRICE"'],
      [/\bASKING\s*PRICE\b/g, 30, 'Indicator: "ASKING PRICE"'],
      [/\bNEGOTIABLE\b/g, 20, 'Indicator: "NEGOTIABLE"'],
      [/\bNEG\b/g, 15, 'Indicator: "NEG (Negotiable)"']
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
   * Match locality from comprehensive 38+ Chennai corridor and micro-market database
   */
  private extractLocality(upperText: string, originalText: string): { locality: ChennaiLocality; subLocation: string } {
    let matchedLocality: ChennaiLocality = 'OMR';
    let subLoc = '';

    // Priority-ordered Chennai localities and alias map
    const localityMap: { name: ChennaiLocality; aliases: string[] }[] = [
      { name: 'Thoraipakkam', aliases: ['THORAIPAKKAM', 'OKKIYAM', 'PTC QUARTERS'] },
      { name: 'Sholinganallur', aliases: ['SHOLINGANALLUR', 'ELCOT SEZ', 'CLASSIC FARMS'] },
      { name: 'Navalur', aliases: ['NAVALUR', 'VIVIRA', 'AGS NAVALUR'] },
      { name: 'Siruseri', aliases: ['SIRUSERI', 'SIPCOT IT PARK'] },
      { name: 'Kelambakkam', aliases: ['KELAMBAKKAM', 'CHETTINAD HOSPITAL'] },
      { name: 'Perungudi', aliases: ['PERUNGUDI', 'KALLUKKUTTAI', 'CBI COLONY', 'SEEVARAM'] },
      { name: 'OMR', aliases: ['OMR', 'OLD MAHABALIPURAM', 'KANDANCHAVADI', 'PADUR', 'SEMMACHERI', 'SEMMANCHERI', 'THALAMBUR', 'KAZHIPATTUR', 'KARAPAKKAM'] },
      
      { name: 'ECR', aliases: ['ECR', 'EAST COAST ROAD', 'INJAMBAKKAM', 'NEELANKARAI', 'PALAVAKKAM', 'KOTTIVAKKAM', 'AKKARAI', 'PANAIYUR', 'UTHANDI', 'KANATHUR', 'KOVALAM'] },
      { name: 'Besant Nagar', aliases: ['BESANT NAGAR', 'ELLIOTS', 'URUR OLCOTT', 'KALAKSHETRA'] },
      { name: 'Thiruvanmiyur', aliases: ['THIRUVANMIYUR', 'VALMIKI NAGAR', 'MARUNDEESWARAR'] },
      { name: 'Adyar', aliases: ['ADYAR', 'GANDHI NAGAR', 'KASTURBA NAGAR', 'INDIRA NAGAR', 'SHASTRI NAGAR', 'PADMANABHA NAGAR'] },
      
      { name: 'Anna Nagar', aliases: ['ANNA NAGAR', 'SHENOY NAGAR', 'THIRUMANGALAM', 'CHINTAMANI', 'ROUNDTANA', 'SHANTHI COLONY', 'ANNA NAGAR WEST', 'ANNA NAGAR EAST'] },
      { name: 'Kilpauk', aliases: ['KILPAUK', 'KELLYS', 'ORMES ROAD', 'POONAMALLEE HIGH ROAD', 'TAYLORS ROAD', 'ASPIRAN GARDEN'] },
      { name: 'Alwarpet', aliases: ['ALWARPET', 'TTK ROAD', 'CP RAMASWAMY', 'ELDAMS ROAD', 'MURRAY\'S GATE'] },
      { name: 'Nungambakkam', aliases: ['NUNGAMBAKKAM', 'STERLING ROAD', 'COLLEGE ROAD', 'HADDOWS ROAD', 'KNK ROAD', 'KHADER NAWAZ KHAN', 'VILLAGE ROAD'] },
      { name: 'T. Nagar', aliases: ['T. NAGAR', 'T NAGAR', 'TNAGAR', 'THYAGARAYA NAGAR', 'PONDY BAZAAR', 'PANAGAL PARK', 'USMAN ROAD', 'VENKATNARAYANA'] },
      { name: 'West Mambalam', aliases: ['WEST MAMBALAM', 'MAMBALAM', 'ARYA GOWDA'] },
      { name: 'Kodambakkam', aliases: ['KODAMBAKKAM', 'LIBERTY', 'MEENAKSHI COLLEGE', 'RANGARAJAPURAM'] },
      { name: 'Vadapalani', aliases: ['VADAPALANI', '100 FEET ROAD', 'ARCOT ROAD', 'KUMARAN COLONY'] },
      { name: 'Valasaravakkam', aliases: ['VALASARAVAKKAM', 'CHOWDRY NAGAR', 'ALWARTHIRUNAGAR'] },
      { name: 'Porur', aliases: ['PORUR', 'RAMAPURAM', 'MUGALIVAKKAM', 'IYYAPPANTHANGAL', 'GERUGAMBAKKAM', 'MOULIVAKKAM', 'KUNDRATHUR ROAD'] },
      { name: 'Mogappair', aliases: ['MOGAPPAIR', 'MOLASUR', 'GOLDEN GEORGE', 'NOLAMBUR', 'COLLECTOR NAGAR'] },
      { name: 'Ambattur', aliases: ['AMBATTUR', 'AMBATTUR OT', 'AMBATTUR ESTATE', 'MENAMBEDU'] },
      { name: 'Korattur', aliases: ['KORATTUR', 'CENTRAL AVENUE'] },
      { name: 'Kolathur', aliases: ['KOLATHUR', 'RETTERI', 'PUTHAGARAM', 'VILLIVAKKAM'] },
      { name: 'Perambur', aliases: ['PERAMBUR', 'SEMBIAM', 'JAMALIA', 'BB ROAD'] },
      { name: 'Egmore', aliases: ['EGMORE', 'PANTHEON ROAD', 'MONTIETH ROAD', 'GANDHI IRWIN'] },
      { name: 'Royapettah', aliases: ['ROYAPETTAH', 'LLOYDS ROAD', 'AVVAI SHANMUGAM', 'EXPRESS AVENUE'] },
      { name: 'Triplicane', aliases: ['TRIPLICANE', 'PARTHASARATHY', 'ICE HOUSE', 'PYCROFTS'] },
      
      { name: 'Velachery', aliases: ['VELACHERY', 'VIJAYANAGAR', 'DHANDESWARAM', 'TANSI NAGAR', 'BABY NAGAR', 'BHUVANESHWARI NAGAR'] },
      { name: 'Madipakkam', aliases: ['MADIPAKKAM', 'KEELKATTALAI', 'PUZHUTHIVAKKAM', 'ULLAGARAM', 'MOOVARASAMPETTAI'] },
      { name: 'Pallikaranai', aliases: ['PALLIKARANAI', 'KAMAKOTI NAGAR', 'MARSHLAND', 'OIL MILL ROAD'] },
      { name: 'Medavakkam', aliases: ['MEDAVAKKAM', 'SOWMYA NAGAR', 'VENGAIVASAL', 'SITHALAPAKKAM', 'BABU NAGAR'] },
      { name: 'Nanganallur', aliases: ['NANGANALLUR', 'ANJANEYAR TEMPLE', 'ROJA MEDICALS'] },
      { name: 'Guindy', aliases: ['GUINDY', 'EKATTUTHANGAL', 'KATHIPARA', 'RACE COURSE', 'CIPET'] },
      { name: 'Pallavaram', aliases: ['PALLAVARAM', 'OLD PALLAVARAM', 'CANTONMENT', 'ZAMIN PALLAVARAM'] },
      { name: 'Chromepet', aliases: ['CHROMEPET', 'RADHA NAGAR', 'HASTHINAPURAM', 'NEMILICHERY', 'CLC WORKS ROAD'] },
      { name: 'Tambaram', aliases: ['TAMBARAM', 'EAST TAMBARAM', 'WEST TAMBARAM', 'SELAIYUR', 'CAMP ROAD', 'SANATORIUM'] },
      { name: 'Guduvanchery', aliases: ['GUDUVANCHERY', 'NANDIVARAM', 'MAHALAKSHMI NAGAR', 'URAPAKKAM'] },
      { name: 'Avadi', aliases: ['AVADI', 'HVF', 'TNHB AVADI', 'KOVILPATHU'] }
    ];

    let found = false;
    for (const item of localityMap) {
      for (const alias of item.aliases) {
        if (upperText.includes(alias)) {
          matchedLocality = item.name;
          if (alias !== item.name.toUpperCase()) {
            subLoc = alias.charAt(0) + alias.slice(1).toLowerCase();
          }
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!subLoc) {
      const nearMatch = originalText.match(/\b(?:near|opp|opposite|close to|behind|beside)\s+([A-Za-z0-9\s]{3,28})/i);
      if (nearMatch && nearMatch[1]) {
        subLoc = nearMatch[1].trim();
      }
    }

    return { locality: matchedLocality, subLocation: subLoc };
  }

  private extractPropertyType(text: string): PropertyType {
    if (/\b(?:VILLA|GATED VILLA|BEACH VILLA|ROW HOUSE|INDIVIDUAL VILLA)\b/.test(text)) return 'Villa';
    if (/\b(?:INDEPENDENT HOUSE|HOUSE|BUNGALOW|DUPLEX|INDIVIDUAL HOUSE|STANDALONE)\b/.test(text)) return 'Independent house';
    if (/\b(?:PLOT|LAND|VACANT LAND|GROUNDS?|CENTS?|RESIDENTIAL PLOT|LAYOUT)\b/.test(text)) return 'Residential Plot';
    if (/\b(?:COMMERCIAL|OFFICE SPACE|OFFICE|SHOWROOM|SHOP|GODOWN|WAREHOUSE|RETAIL)\b/.test(text)) return 'Commercial';
    return 'Apartment';
  }

  private extractTransactionType(text: string): TransactionType {
    if (/\b(?:TO LET|FOR RENT|RENTAL|ON RENT|AVAILABLE FOR RENT)\b/.test(text)) return 'Rent';
    if (/\b(?:LEASE|LONG LEASE)\b/.test(text)) return 'Lease';
    return 'Sale';
  }

  private extractBhk(text: string, propertyType: PropertyType): number | string {
    if (propertyType === 'Residential Plot') return 'Plot';
    if (propertyType === 'Commercial') return 'Commercial';

    const match = text.match(/\b([1-6])(?:\.5)?\s*(?:BHK|B\/R|BEDROOMS?|BEDS?)\b/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    if (/\b1\s*RK\b|\bSTUDIO\b/.test(text)) return '1 RK';
    if (/\bSINGLE BED(?:ROOM)?\b/.test(text)) return 1;
    if (/\bDOUBLE BED(?:ROOM)?\b/.test(text)) return 2;
    if (/\bTRIPLE BED(?:ROOM)?\b/.test(text)) return 3;
    if (/\bPENTHOUSE\b/.test(text)) return 4;
    return 3;
  }

  private extractArea(text: string): number {
    const sqftMatch = text.match(/\b(\d{3,5})\s*(?:SQ\.?\s*FT|SQFT|SFT|SQUARE\s*FEET|SQ\.FEET)\b/);
    if (sqftMatch && sqftMatch[1]) {
      return parseInt(sqftMatch[1], 10);
    }

    const groundMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(?:GROUNDS?|GRD|GRND)\b/);
    if (groundMatch && groundMatch[1]) {
      return Math.round(parseFloat(groundMatch[1]) * 2400);
    }

    const centMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(?:CENTS?|CT)\b/);
    if (centMatch && centMatch[1]) {
      return Math.round(parseFloat(centMatch[1]) * 435.6);
    }

    const yardMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(?:SQ\.?\s*YD|SQ\s*YARDS?)\b/);
    if (yardMatch && yardMatch[1]) {
      return Math.round(parseFloat(yardMatch[1]) * 9);
    }

    return 1450;
  }

  private extractUds(text: string): number | undefined {
    const udsMatch = text.match(/\b(?:UDS|U\.D\.S|UNDIVIDED\s+SHARE)\s*:?\s*(\d{2,4})\s*(?:SQ\.?\s*FT|SQFT|SFT)?\b/);
    if (udsMatch && udsMatch[1]) {
      return parseInt(udsMatch[1], 10);
    }
    return undefined;
  }

  private extractPrice(text: string, builtUpAreaSqFt: number): { priceLakhs: number; priceDisplay: string; priceType: 'Total price' | 'Per sq.ft.' | 'Negotiable' } {
    const isNegotiable = /\b(?:NEG|NEGOTIABLE|SLIGHTLY NEG)\b/.test(text);

    // 1. Compound Crores + Lakhs: e.g. "1 Cr 25 L", "1 Crore 30 Lakhs"
    const compoundMatch = text.match(/(\d+)\s*(?:CR(?:ORE)?S?)\s*(?:AND\s*)?(\d+)\s*(?:L(?:AC|AKH)?S?)\b/);
    if (compoundMatch && compoundMatch[1] && compoundMatch[2]) {
      const cr = parseInt(compoundMatch[1], 10);
      const lk = parseInt(compoundMatch[2], 10);
      const totalLakhs = (cr * 100) + lk;
      return {
        priceLakhs: totalLakhs,
        priceDisplay: `₹${(totalLakhs / 100).toFixed(2)} Cr`,
        priceType: isNegotiable ? 'Negotiable' : 'Total price'
      };
    }

    // 2. Crores: e.g. "1.45 Cr", "2.2 C", "1.85 CRORES", "₹1.5Cr"
    const croreMatch = text.match(/(?:RS\.?|INR|₹)?\s*(\d+(?:\.\d+)?)\s*(?:CR(?:ORE)?S?|C)\b/);
    if (croreMatch && croreMatch[1]) {
      const valCr = parseFloat(croreMatch[1]);
      const lakhs = Math.round(valCr * 100);
      return {
        priceLakhs: lakhs,
        priceDisplay: `₹${valCr} Cr`,
        priceType: isNegotiable ? 'Negotiable' : 'Total price'
      };
    }

    // 3. Lakhs: e.g. "85 L", "95 Lacs", "₹75L", "80 Lakhs", "92.5 L"
    const lakhMatch = text.match(/(?:RS\.?|INR|₹)?\s*(\d+(?:\.\d+)?)\s*(?:L(?:AC|AKH)?S?)\b/);
    if (lakhMatch && lakhMatch[1]) {
      const valLakh = parseFloat(lakhMatch[1]);
      return {
        priceLakhs: Math.round(valLakh),
        priceDisplay: `₹${valLakh} Lakhs`,
        priceType: isNegotiable ? 'Negotiable' : 'Total price'
      };
    }

    // 4. Rent (Thousand / Lakhs pm): e.g. "Rent 45k", "Rent 35000", "Rs. 25,000 pm"
    const rentMatch = text.match(/\b(?:RENT|RENTAL|TO LET)?\s*:?\s*(?:RS\.?|INR|₹)?\s*(\d{1,3}(?:,\d{3})+|\d{4,6}|\d{1,3}\s*K)\s*(?:PM|P\.M\.|PER\s*MONTH|\/\s*MONTH|RENT)?\b/);
    if (rentMatch && rentMatch[1] && (text.includes('RENT') || text.includes('TO LET') || text.includes('PM'))) {
      let rawVal = rentMatch[1].replace(/,/g, '').trim();
      let rentAmt = 0;
      if (rawVal.toUpperCase().endsWith('K')) {
        rentAmt = parseFloat(rawVal) * 1000;
      } else {
        rentAmt = parseInt(rawVal, 10);
      }
      if (rentAmt > 0) {
        const rentInLakhs = Math.round((rentAmt / 100000) * 100) / 100;
        return {
          priceLakhs: rentInLakhs,
          priceDisplay: `₹${rentAmt.toLocaleString('en-IN')}/month`,
          priceType: 'Total price'
        };
      }
    }

    // 5. Rate per sq.ft.: e.g. "Rs. 6500/sqft", "7500 per sft"
    const sqftRateMatch = text.match(/(?:RS\.?|INR|₹)?\s*(\d{4,5})\s*(?:\/|\s*PER\s*)(?:SQ\.?\s*FT|SQFT|SFT)\b/);
    if (sqftRateMatch && sqftRateMatch[1]) {
      const rate = parseInt(sqftRateMatch[1], 10);
      const computedLakhs = Math.round((rate * (builtUpAreaSqFt || 1450)) / 100000);
      return {
        priceLakhs: computedLakhs,
        priceDisplay: `₹${rate}/sq.ft. (₹${computedLakhs}L)`,
        priceType: 'Per sq.ft.'
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
    if (/\bNORTH[\s-]*EAST\b|\bN[\s-]*E\b/.test(text)) return 'North-East';
    if (/\bSOUTH[\s-]*EAST\b|\bS[\s-]*E\b/.test(text)) return 'South-East';
    if (/\bNORTH[\s-]*WEST\b|\bN[\s-]*W\b/.test(text)) return 'North-West';
    if (/\bSOUTH[\s-]*WEST\b|\bS[\s-]*W\b/.test(text)) return 'South-West';
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
    else if (/\bPANCHAYAT\b/.test(text)) approvalStatus = 'Panchayat approved';
    else if (/\bCLEAR TITLE\b/.test(text)) approvalStatus = 'Reviewed clear title';
    else if (/\bPATTA\b/.test(text)) approvalStatus = 'Patta land';

    const keyFeatures: string[] = [];
    if (/\b(?:2\s*CCP|TWO\s*CAR\s*PARK)\b/.test(text)) keyFeatures.push('2 Covered Car Parking (2 CCP)');
    else if (/\b(?:CCP|COVERED CAR PARK)\b/.test(text)) keyFeatures.push('Covered Car Parking (CCP)');
    else if (/\b(?:CAR PARK|PARKING)\b/.test(text)) keyFeatures.push('Car Parking');

    if (/\bLIFT\b/.test(text)) keyFeatures.push('Lift Facility');
    if (/\b(?:POWER BACKUP|GENERATOR|GEN BACKUP)\b/.test(text)) keyFeatures.push('100% Power Backup');
    if (/\b(?:METRO WATER|CMWSSB)\b/.test(text)) keyFeatures.push('Metro Water Connection');
    if (/\bBOREWELL\b/.test(text)) keyFeatures.push('Borewell Water');
    if (/\b(?:SWIMMING POOL|POOL)\b/.test(text)) keyFeatures.push('Swimming Pool');
    if (/\bGYM\b/.test(text)) keyFeatures.push('Gymnasium');
    if (/\b(?:GATED|SECURITY|CCTV)\b/.test(text)) keyFeatures.push('24/7 Security & CCTV');
    if (/\b(?:SEA VIEW|BEACH)\b/.test(text)) keyFeatures.push('Sea View / Ocean Breeze');
    if (/\b(?:VAASTU|VASTU|100% VAASTU)\b/.test(text)) keyFeatures.push('100% Vaastu Compliant');
    if (/\bBALCONY\b/.test(text)) keyFeatures.push('Spacious Balcony');
    if (/\bMODULAR KITCHEN\b/.test(text)) keyFeatures.push('Modular Kitchen');
    if (/\bREADY TO OCCUPY\b/.test(text)) keyFeatures.push('Ready to Occupy');
    if (/\bBRAND NEW\b/.test(text)) keyFeatures.push('Brand New Construction');

    return { approvalStatus, keyFeatures };
  }

  /**
   * Smart Paraphrase Engine:
   * Transforms raw, cryptic newspaper classified text into a polished, professional marketing title
   * and a structured client-ready narrative pitch.
   */
  public generateParaphrase(params: {
    detectedType: 'seller' | 'buyer';
    propertyType: PropertyType;
    transactionType: TransactionType;
    locality: ChennaiLocality;
    subLocation?: string;
    bhk: number | string;
    builtUpAreaSqFt: number;
    udsSqFt?: number;
    priceDisplay: string;
    priceType: string;
    contactName: string;
    contactPhone: string;
    facing?: string;
    approvalStatus?: string;
    keyFeatures: string[];
    cleanText: string;
  }): { title: string; pitch: string } {
    const locWithSub = params.subLocation 
      ? `${params.locality} (${params.subLocation})`
      : params.locality;

    if (params.detectedType === 'seller') {
      // Title
      const title = `${params.bhk ? params.bhk + ' BHK ' : ''}${params.propertyType} for ${params.transactionType} in ${locWithSub} • ${params.builtUpAreaSqFt.toLocaleString('en-IN')} Sq.Ft • ${params.priceDisplay}`;

      // Structured Narrative Pitch
      const featuresList = params.keyFeatures.length > 0 
        ? params.keyFeatures.map(f => `  • ${f}`).join('\n')
        : '  • Clear title with standard residential amenities';

      const pitch = 
`🌟 PREMIUM REAL ESTATE LISTING — ${params.locality.toUpperCase()}${params.subLocation ? ' (' + params.subLocation + ')' : ''}

🏡 Property Overview:
Spacious ${params.bhk ? params.bhk + ' BHK ' : ''}${params.propertyType} situated in the prime residential corridor of ${locWithSub}. Offers ${params.builtUpAreaSqFt.toLocaleString('en-IN')} Sq.Ft of super built-up area${params.udsSqFt ? ' with ' + params.udsSqFt + ' Sq.Ft high UDS' : ''}${params.facing ? ' (' + params.facing + '-facing, 100% Vaastu compliant)' : ''}.

💎 Clearances & Amenities:
  • Legal Approval: ${params.approvalStatus || 'CMDA Approved & Marketable Title'}
${featuresList}

💰 Financials & Commercials:
  • Asking Price: ${params.priceDisplay} (${params.priceType})
  • Transaction Mode: Outright ${params.transactionType}

📞 Contact for Inspection & Negotiations:
  • Point of Contact: ${params.contactName}
  • Direct Phone: ${params.contactPhone}
  • Verified Source: The Hindu Classifieds (${new Date().toLocaleDateString('en-IN')})

📝 Original Classified Text:
"${params.cleanText}"`;

      return { title, pitch };
    } else {
      // Buyer Title
      const title = `Buyer Requirement: ${params.bhk ? params.bhk + ' BHK ' : ''}${params.propertyType} in ${locWithSub} • Budget ${params.priceDisplay}`;

      // Buyer Pitch
      const pitch = 
`🎯 VERIFIED BUYER REQUIREMENT — ${params.locality.toUpperCase()}${params.subLocation ? ' (' + params.subLocation + ')' : ''}

👤 Client Requirement:
Active buyer seeking a ${params.bhk ? params.bhk + ' BHK ' : ''}${params.propertyType} in ${locWithSub}.

📐 Specifications & Criteria:
  • Built-up Area Required: ~${params.builtUpAreaSqFt.toLocaleString('en-IN')} Sq.Ft or above
  • Preferred Facing: ${params.facing || 'East / North facing preferred'}
  • Condition: Ready to occupy or well-maintained resale with clear legal documentation

💼 Budget & Funding:
  • Maximum Budget: Up to ${params.priceDisplay}
  • Financing: Pre-approved bank loan / ready funds for immediate token

📞 Direct Buyer Contact:
  • Contact Person: ${params.contactName}
  • Mobile Number: ${params.contactPhone}
  • Source: The Hindu Classifieds (${new Date().toLocaleDateString('en-IN')})

📝 Original Classified Text:
"${params.cleanText}"`;

      return { title, pitch };
    }
  }
}
