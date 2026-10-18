export type UserRole = 'owner' | 'admin' | 'manager' | 'agent';

export interface AgentProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarColor: string;
  photoURL?: string;
  joinedVia?: 'google' | 'invite' | 'creator';
  accessedAt?: number;
  activeListingsCount: number;
  activeLeadsCount: number;
  closedSalesVolumeLakhs: number;
  commissionEarnedLakhs: number;
}

export type PropertyType = 
  | 'Apartment'
  | 'Independent house'
  | 'Villa'
  | 'Builder floor'
  | 'Commercial'
  | 'Office'
  | 'Shop'
  | 'Warehouse'
  | 'Industrial'
  | 'Residential Plot'
  | 'Other';

export type TransactionType = 'Sale' | 'Rent' | 'Lease';
export type FurnishingStatus = 'Unfurnished' | 'Semi-furnished' | 'Fully furnished' | 'Semi-Furnished' | 'Fully Furnished';
export type ListingStatus = 'Available' | 'Active' | 'Under negotiation' | 'Under Negotiation' | 'Sold' | 'Sold / closed' | 'Rented' | 'On hold' | 'Withdrawn' | 'Delisted';
export type VerificationStatus = 'Verified' | 'Pending Verification' | 'Needs Inspection';

export type ChennaiLocality = 
  | 'Adyar'
  | 'Alwarpet'
  | 'Ambattur'
  | 'Anna Nagar'
  | 'Avadi'
  | 'Besant Nagar'
  | 'Chromepet'
  | 'Egmore'
  | 'ECR'
  | 'Guduvanchery'
  | 'Guindy'
  | 'Kelambakkam'
  | 'Kilpauk'
  | 'Kodambakkam'
  | 'Korattur'
  | 'Madipakkam'
  | 'Medavakkam'
  | 'Mogappair'
  | 'Nanganallur'
  | 'Navalur'
  | 'Nungambakkam'
  | 'OMR'
  | 'Pallavaram'
  | 'Pallikaranai'
  | 'Perambur'
  | 'Perungudi'
  | 'Porur'
  | 'Royapettah'
  | 'Sholinganallur'
  | 'Siruseri'
  | 'Tambaram'
  | 'T. Nagar'
  | 'Thiruvanmiyur'
  | 'Thoraipakkam'
  | 'Triplicane'
  | 'Vadapalani'
  | 'Valasaravakkam'
  | 'Velachery'
  | 'West Mambalam'
  | (string & {});

export const CHENNAI_LOCALITIES: ChennaiLocality[] = [
  'Adyar',
  'Alwarpet',
  'Ambattur',
  'Anna Nagar',
  'Avadi',
  'Besant Nagar',
  'Chromepet',
  'Egmore',
  'ECR',
  'Guduvanchery',
  'Guindy',
  'Kelambakkam',
  'Kilpauk',
  'Kodambakkam',
  'Korattur',
  'Madipakkam',
  'Medavakkam',
  'Mogappair',
  'Nanganallur',
  'Navalur',
  'Nungambakkam',
  'OMR',
  'Pallavaram',
  'Pallikaranai',
  'Perambur',
  'Perungudi',
  'Porur',
  'Royapettah',
  'Sholinganallur',
  'Siruseri',
  'Tambaram',
  'T. Nagar',
  'Thiruvanmiyur',
  'Thoraipakkam',
  'Triplicane',
  'Vadapalani',
  'Valasaravakkam',
  'Velachery',
  'West Mambalam'
];

export interface PropertyListing {
  id: string;
  title: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  locality: ChennaiLocality;
  subLocation: string;
  city: 'Chennai';
  bhk: number | string;
  builtUpAreaSqFt: number;
  carpetAreaSqFt?: number;
  superBuiltUpAreaSqFt?: number;
  udsSqFt?: number; // Undivided Share of Land in sq.ft. (Critical in Chennai)
  priceLakhs: number; // in Lakhs INR (e.g. 145 = ₹1.45 Crores, or 0.45 = ₹45,000 rent)
  priceType?: 'Total price' | 'Per sq.ft.' | 'Negotiable';
  priceInclusions?: 'Base price only' | 'Registration / statutory charges included' | 'Parking / amenities included' | 'All-in cost confirmed in writing' | 'Not confirmed';
  maintenanceMonthlyINR: number;
  furnishing: FurnishingStatus;
  facing: 'North' | 'South' | 'East' | 'West' | 'North-East' | 'North-West' | 'South-East' | 'South-West' | 'North & East corner' | 'Other';
  floorNumber: number | string;
  totalFloors: number;
  floorPreferenceDetail?: string;
  balconies?: string; // 'No balcony' | '1 balcony' | '2 balconies' | '3+ balconies'
  bathrooms?: string; // '1 bathroom' | '2 bathrooms' | '3 bathrooms' | '4+ bathrooms'
  buildingAge?: string; // 'New / under construction' | '0–1 year' | '2–5 years' | '6–10 years' | '11–15 years' | '16–25 years' | '25+ years'
  carParkingCount: number;
  parkingType?: string; // '2-wheeler' | 'Covered car parking' | 'Open car parking' | '2 car parks' | 'Visitor parking' | 'No parking'
  parkingCountDetail?: string; // 'None' | '1 car' | '2 cars' | '3+ cars' | 'Covered / stilt' | 'Covered + visitor parking'
  liftFacility?: string; // 'Required / available' | 'Not required / unavailable' | 'Stretcher lift' | 'Passenger + service lift'
  waterSource?: string; // 'Metro water' | 'Borewell' | 'Metro + borewell' | 'Tanker dependent' | 'Common / packaged water' | 'Not verified'
  drainage?: string; // 'UGD / municipal sewer' | 'Septic tank' | 'Both / mixed' | 'Not verified'
  floodHistory?: string; // 'No known issue — verify locally' | 'Known waterlogging reported' | 'Flood-affected previously' | 'Not checked'
  powerBackup?: string; // 'Full backup' | 'Common-area backup only' | 'No backup' | 'Not specified'
  metroDistanceKm?: number;
  commutePriority?: string;
  amenities: string[];

  // Legal, Approvals & Verification
  verificationStatus: VerificationStatus;
  approvalStatus?: string; // 'CMDA approved' | 'DTCP approved' | 'RERA registered' | 'Panchayat / local body' | 'Unapproved' | 'Under process' | 'Not applicable' | 'Other / verify'
  approvalAuthority?: string; // 'CMDA' | 'DTCP' | 'Greater Chennai Corporation / local body' | 'Other authority' | 'Not verified' | 'Not applicable'
  reraNumber?: string;
  occupancyCertificate?: string; // 'Available' | 'Not available' | 'Not applicable / under construction' | 'Pending verification'
  pattaStatus?: string; // 'Patta available' | 'Joint patta' | 'Parent documents available' | 'Title verification pending' | 'Dispute / issue reported' | 'Not applicable'
  titleChainStatus?: string; // 'Reviewed by lawyer' | 'Documents received — not reviewed' | 'Pending from owner' | 'Issue / dispute flagged' | 'Not applicable'
  encumbranceCertificate?: string; // 'Verified clear' | 'Pending verification' | 'Issue found'
  propertyTaxStatus?: string; // 'Receipts available, no known dues' | 'Dues to be checked' | 'Outstanding dues reported' | 'Not applicable'
  possessionTimeline?: string; // 'Ready to occupy' | 'Under construction' | 'Tenanted' | 'Owner occupied' | 'Available later' | 'Not specified'
  tenancyStatus?: string; // 'Vacant possession' | 'Owner occupied' | 'Tenant occupied' | 'Possession after agreed date' | 'Under construction'
  loanEligibility?: string; // 'Bank loan possible (verify)' | 'Cash only / loan issue' | 'Under bank review' | 'Not applicable'
  negotiability?: string; // 'Negotiable' | 'Fixed price' | 'Open to offer' | 'Urgent sale'
  brokerageTerms?: string; // '2% / agreed amount', '1 month rent', etc.
  siteVisitTiming?: string; // e.g. 'Weekends after 11 AM'
  floodAndRiskNotes?: string;
  notes?: string;

  // Owner details
  ownerName: string;
  ownerPhone: string;
  ownerAltPhone?: string;
  ownerEmail?: string;
  listingStatus: ListingStatus;
  photos: string[];
  assignedAgentId: string;
  assignedAgentName: string;
  addedBy?: string;
  addedByEmail?: string;
  addedAt?: number;
  updatedBy?: string;
  updatedByEmail?: string;
  createdAt: number;
  updatedAt: number;
  isDuplicate?: boolean;
  duplicateOfId?: string;
  viewCount: number;
}

export type LeadType = 'Buyer' | 'Tenant' | 'Seller' | 'Landlord';
export type LeadStage = 'New' | 'Contacted' | 'Qualified' | 'Site Visit Scheduled' | 'In Negotiation' | 'Closed Won' | 'Closed Lost' | 'On Hold';
export type LeadPriority = 'High' | 'Medium' | 'Low' | 'Urgent';
export type LeadSource = 'Website Form' | 'Referral' | '99acres' | 'MagicBricks' | 'Walk-in' | 'Instagram/Facebook' | 'WhatsApp' | 'Cold call' | 'Existing client' | 'Signboard' | 'The Hindu Classifieds' | 'Other';

export interface LeadCRM {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  email: string;
  leadType: LeadType;
  stage: LeadStage;
  priority: LeadPriority;
  source: LeadSource;
  assignedAgentId: string;
  assignedAgentName: string;
  
  // Property Requirement Specifics
  preferredLocalities: ChennaiLocality[];
  preferredPropertyType: PropertyType;
  preferredBhk?: number | string;
  purpose?: string; // 'Self-use' | 'Investment' | 'Rental income' | 'Commercial use' | 'Development' | 'Other'
  budgetMinLakhs: number;
  budgetMaxLakhs: number;
  priceType?: string;
  preferredFacing?: string;
  preferredFloor?: string;
  preferredFloorDetail?: string;
  minBuiltUpSqFt?: number;
  minCarpetSqFt?: number;
  minUdsSqFt?: number;
  requiredBalconies?: string;
  requiredBathrooms?: string;
  preferredAge?: string;
  liftRequired?: string;
  parkingRequired?: string;
  parkingCountRequired?: string;
  furnishingPreferred?: FurnishingStatus;
  waterSourcePreference?: string;
  drainagePreference?: string;
  floodPreference?: string;
  powerBackupPreference?: string;
  commutePriority?: string;
  amenitiesPreferred?: string[];

  // Legal & Qualification
  requiredApproval?: string;
  loanReadiness?: string;
  timeline?: string; // 'Immediate (0–30 days)' | '1–3 months' | '3–6 months' | '6+ months' | 'Just exploring'
  fundingReadiness?: string; // 'Funds ready' | 'Loan pre-approved' | 'Loan needed' | 'Property sale dependent' | 'Not applicable'
  decisionMakerConfirmed?: string; // 'Yes' | 'Family / partner involved' | 'Need to confirm' | 'Not asked'
  
  notes: string;
  lastContactDate: number;
  nextFollowUpDate: number;
  matchedPropertyIds: string[];
  dealValueLakhs?: number;
  expectedCommissionINR?: number;
  collectedCommissionINR?: number;
  addedBy?: string;
  addedByEmail?: string;
  addedAt?: number;
  updatedBy?: string;
  updatedByEmail?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface CompatibilityMatch {
  buyer: LeadCRM;
  property: PropertyListing;
  score: number;
  why: string[];
  miss: string[];
}

export interface SiteVisit {
  id: string;
  propertyId: string;
  propertyTitle: string;
  locality: ChennaiLocality;
  leadId: string;
  leadName: string;
  leadPhone: string;
  agentId: string;
  agentName: string;
  scheduledTime: number;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';
  feedbackNotes?: string;
  interestLevel: 'Hot' | 'Warm' | 'Cold' | 'Not Interested';
}

export interface LocalityMarketData {
  locality: ChennaiLocality;
  avgPricePerSqFtINR: number;
  avgRentalYieldPercent: number;
  quarterlyGrowthPercent: number;
  activeListingsCount: number;
  highDemandSegment: string;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isAnonymous?: boolean;
}

export interface FirebaseConfigOptions {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}
