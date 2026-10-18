import { Injectable, signal, computed } from '@angular/core';
import {
  PropertyListing,
  LeadCRM,
  SiteVisit,
  AgentProfile,
  ChennaiLocality,
  LocalityMarketData,
  CHENNAI_LOCALITIES,
  PropertyType,
  TransactionType,
  ListingStatus,
  LeadStage,
  CompatibilityMatch
} from '../models/realty.model';

const STORAGE_KEY_PROPERTIES = 'skypearl_realty_properties_v2';
const STORAGE_KEY_LEADS = 'skypearl_realty_leads_v2';
const STORAGE_KEY_VISITS = 'skypearl_realty_visits_v2';
const STORAGE_KEY_ACTIVE_AGENT = 'skypearl_active_agent';

export const CHENNAI_TEAM_AGENTS: AgentProfile[] = [
  {
    uid: 'agent-rajesh-admin-01',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@skypearl.in',
    phone: '+91 98401 22334',
    role: 'admin',
    avatarColor: 'linear-gradient(135deg, #f59e0b, #ec4899)',
    activeListingsCount: 14,
    activeLeadsCount: 28,
    closedSalesVolumeLakhs: 850,
    commissionEarnedLakhs: 17.0
  },
  {
    uid: 'agent-priya-mgr-02',
    name: 'Priya Sundaram',
    email: 'priya.s@skypearl.in',
    phone: '+91 98410 44556',
    role: 'manager',
    avatarColor: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    activeListingsCount: 11,
    activeLeadsCount: 22,
    closedSalesVolumeLakhs: 620,
    commissionEarnedLakhs: 12.4
  },
  {
    uid: 'agent-karthik-03',
    name: 'Karthik Raman',
    email: 'karthik.r@skypearl.in',
    phone: '+91 98840 88990',
    role: 'agent',
    avatarColor: 'linear-gradient(135deg, #10b981, #14b8a6)',
    activeListingsCount: 9,
    activeLeadsCount: 18,
    closedSalesVolumeLakhs: 380,
    commissionEarnedLakhs: 7.6
  }
];

export const CHENNAI_MARKET_INSIGHTS: LocalityMarketData[] = [
  { locality: 'OMR', avgPricePerSqFtINR: 6450, avgRentalYieldPercent: 4.8, quarterlyGrowthPercent: 3.2, activeListingsCount: 42, highDemandSegment: '2 & 3 BHK Tech Apartments' },
  { locality: 'ECR', avgPricePerSqFtINR: 9800, avgRentalYieldPercent: 3.6, quarterlyGrowthPercent: 4.5, activeListingsCount: 19, highDemandSegment: 'Sea-facing Gated Villas' },
  { locality: 'Adyar', avgPricePerSqFtINR: 14200, avgRentalYieldPercent: 3.2, quarterlyGrowthPercent: 2.1, activeListingsCount: 24, highDemandSegment: 'Ultra Luxury 3 & 4 BHK' },
  { locality: 'Anna Nagar', avgPricePerSqFtINR: 12800, avgRentalYieldPercent: 3.4, quarterlyGrowthPercent: 2.8, activeListingsCount: 31, highDemandSegment: 'Independent Homes & Flats' },
  { locality: 'Besant Nagar', avgPricePerSqFtINR: 16500, avgRentalYieldPercent: 3.0, quarterlyGrowthPercent: 1.9, activeListingsCount: 12, highDemandSegment: 'Beachfront Premium Living' },
  { locality: 'Velachery', avgPricePerSqFtINR: 7200, avgRentalYieldPercent: 5.1, quarterlyGrowthPercent: 3.8, activeListingsCount: 38, highDemandSegment: 'Mid-Segment Residential' },
  { locality: 'T. Nagar', avgPricePerSqFtINR: 15400, avgRentalYieldPercent: 4.2, quarterlyGrowthPercent: 2.4, activeListingsCount: 27, highDemandSegment: 'Commercial & Luxury Resale' },
  { locality: 'Porur', avgPricePerSqFtINR: 5900, avgRentalYieldPercent: 4.9, quarterlyGrowthPercent: 4.1, activeListingsCount: 35, highDemandSegment: 'Affordable & Rental Tech Hub' }
];

@Injectable({
  providedIn: 'root'
})
export class RealtyService {
  public readonly properties = signal<PropertyListing[]>([]);
  public readonly leads = signal<LeadCRM[]>([]);
  public readonly siteVisits = signal<SiteVisit[]>([]);
  public readonly activeAgent = signal<AgentProfile>(CHENNAI_TEAM_AGENTS[0]);
  public readonly notification = signal<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Active view section in CRM
  public readonly activeView = signal<'dashboard' | 'properties' | 'leads' | 'connections' | 'visits' | 'insights' | 'access'>('dashboard');

  // Theme Management (White/Light Theme & Dark Theme)
  public readonly currentTheme = signal<'light' | 'dark'>('light');

  public toggleTheme(): void {
    const next = this.currentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  public setTheme(theme: 'light' | 'dark'): void {
    this.currentTheme.set(theme);
    localStorage.setItem('skypearl_theme', theme);
    if (typeof document !== 'undefined') {
      document.body.classList.remove('light-theme', 'dark-theme');
      document.body.classList.add(theme + '-theme');
      document.documentElement.setAttribute('data-theme', theme);
    }
    this.notify(`Switched to ${theme === 'light' ? 'Executive White' : 'Dark'} theme.`, 'info');
  }

  // Computed Permissions
  public readonly isAdmin = computed(() => this.activeAgent().role === 'admin');
  public readonly isManager = computed(() => this.activeAgent().role === 'manager' || this.activeAgent().role === 'admin');
  public readonly canManageTeam = computed(() => this.activeAgent().role === 'admin');
  public readonly canViewOwnerContacts = computed(() => this.activeAgent().role === 'admin' || this.activeAgent().role === 'manager');

  // KPI Metrics
  public readonly totalPropertiesCount = computed(() => this.properties().length);
  public readonly availablePropertiesCount = computed(() => 
    this.properties().filter(p => p.listingStatus === 'Available' || p.listingStatus === 'Active').length
  );
  public readonly totalLeadsCount = computed(() => this.leads().length);
  public readonly activePipelineCount = computed(() => 
    this.leads().filter(l => l.stage !== 'Closed Won' && l.stage !== 'Closed Lost').length
  );
  public readonly dealsWonCount = computed(() => 
    this.leads().filter(l => l.stage === 'Closed Won').length
  );
  public readonly totalPipelineValueLakhs = computed(() => 
    this.leads().reduce((sum, l) => sum + (l.budgetMaxLakhs || 0), 0)
  );
  public readonly totalCommissionEarnedINR = computed(() => 
    this.leads().reduce((sum, l) => sum + (l.collectedCommissionINR || 0), 0)
  );

  // All matches computed
  public readonly allCompatibilityMatches = computed(() => {
    return this.calculateAllMatches();
  });

  public readonly highMatchesCount = computed(() => {
    return this.allCompatibilityMatches().filter(m => m.score >= 60).length;
  });

  constructor() {
    this.initData();
  }

  private initData(): void {
    const savedTheme = (localStorage.getItem('skypearl_theme') as 'light' | 'dark') || 'light';
    this.currentTheme.set(savedTheme);
    if (typeof document !== 'undefined') {
      document.body.classList.remove('light-theme', 'dark-theme');
      document.body.classList.add(savedTheme + '-theme');
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    const savedProps = localStorage.getItem(STORAGE_KEY_PROPERTIES);
    const savedLeads = localStorage.getItem(STORAGE_KEY_LEADS);
    const savedVisits = localStorage.getItem(STORAGE_KEY_VISITS);
    const savedAgent = localStorage.getItem(STORAGE_KEY_ACTIVE_AGENT);

    if (savedAgent) {
      try {
        this.activeAgent.set(JSON.parse(savedAgent));
      } catch {}
    }

    if (savedProps && savedLeads) {
      try {
        this.properties.set(JSON.parse(savedProps));
        this.leads.set(JSON.parse(savedLeads));
        this.siteVisits.set(savedVisits ? JSON.parse(savedVisits) : []);
        return;
      } catch (err) {
        console.warn('Parsing error, reseeding advanced Chennai realty data...', err);
      }
    }

    // Rich initial seed data for Chennai micro-markets conforming to SkyPearl Realty OS specs
    const seedProperties: PropertyListing[] = [
      {
        id: 'prop-omr-01',
        title: 'Prestige Courtyards 3 BHK Luxury High-Rise',
        propertyType: 'Apartment',
        transactionType: 'Sale',
        locality: 'OMR',
        subLocation: 'Sholinganallur Junction',
        city: 'Chennai',
        bhk: 3,
        builtUpAreaSqFt: 1845,
        carpetAreaSqFt: 1420,
        superBuiltUpAreaSqFt: 1845,
        udsSqFt: 590, // UDS
        priceLakhs: 142,
        priceType: 'Total price',
        priceInclusions: 'All-in cost confirmed in writing',
        maintenanceMonthlyINR: 5200,
        furnishing: 'Semi-Furnished',
        facing: 'East',
        floorNumber: 11,
        totalFloors: 19,
        floorPreferenceDetail: 'High floor',
        balconies: '2 balconies',
        bathrooms: '3 bathrooms',
        buildingAge: '2–5 years',
        carParkingCount: 2,
        parkingType: 'Covered car parking',
        parkingCountDetail: '2 cars',
        liftFacility: 'Passenger + service lift',
        waterSource: 'Metro + borewell',
        drainage: 'UGD / municipal sewer',
        floodHistory: 'No known issue — verify locally',
        powerBackup: 'Full backup',
        metroDistanceKm: 1.2,
        commutePriority: 'OMR / IT corridor',
        amenities: ['Swimming Pool', 'Clubhouse', 'Gym', '24/7 Security', 'Covered Parking', 'Power Backup', 'CCTV', 'Children\'s play area'],
        
        verificationStatus: 'Verified',
        approvalStatus: 'CMDA approved',
        approvalAuthority: 'CMDA',
        reraNumber: 'TN/01/Building/0192/2019',
        occupancyCertificate: 'Available',
        pattaStatus: 'Patta available',
        titleChainStatus: 'Reviewed by lawyer',
        encumbranceCertificate: 'Verified clear',
        propertyTaxStatus: 'Receipts available, no known dues',
        possessionTimeline: 'Ready to occupy',
        tenancyStatus: 'Vacant possession',
        loanEligibility: 'Bank loan possible (verify)',
        negotiability: 'Negotiable',
        brokerageTerms: '2% agreed',
        siteVisitTiming: 'Weekends after 11 AM',
        floodAndRiskNotes: 'Elevated podium, wide 60ft approach road, rainwater harvesting functional.',

        ownerName: 'V. Sundararajan (NRI)',
        ownerPhone: '+91 94440 12890',
        ownerAltPhone: '+91 94440 12891',
        ownerEmail: 'sundar.v@gmail.com',
        listingStatus: 'Available',
        photos: [
          'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
        ],
        assignedAgentId: 'agent-karthik-03',
        assignedAgentName: 'Karthik Raman',
        createdAt: Date.now() - 86400000 * 5,
        updatedAt: Date.now() - 86400000 * 1,
        viewCount: 148
      },
      {
        id: 'prop-ecr-02',
        title: 'Sea-Facing 4 BHK Gated Villa on ECR',
        propertyType: 'Villa',
        transactionType: 'Sale',
        locality: 'ECR',
        subLocation: 'Uthandi Beach Road',
        city: 'Chennai',
        bhk: 4,
        builtUpAreaSqFt: 3800,
        carpetAreaSqFt: 3250,
        superBuiltUpAreaSqFt: 3800,
        udsSqFt: 2400, // Individual plot share
        priceLakhs: 485,
        priceType: 'Total price',
        priceInclusions: 'Registration / statutory charges included',
        maintenanceMonthlyINR: 12000,
        furnishing: 'Fully Furnished',
        facing: 'North-East',
        floorNumber: 2,
        totalFloors: 2,
        floorPreferenceDetail: 'Ground / low floor',
        balconies: '3+ balconies',
        bathrooms: '4+ bathrooms',
        buildingAge: '0–1 year',
        carParkingCount: 3,
        parkingType: 'Covered car parking',
        parkingCountDetail: '3+ cars',
        liftFacility: 'Required / available',
        waterSource: 'Borewell',
        drainage: 'Septic tank',
        floodHistory: 'No known issue — verify locally',
        powerBackup: 'Full backup',
        metroDistanceKm: 6.5,
        commutePriority: 'Quiet residential street',
        amenities: ['Private Garden', 'Swimming pool', 'Solar Backup', '24/7 Gated Security', 'Gym', 'Pet friendly', 'Vastu preferred'],

        verificationStatus: 'Verified',
        approvalStatus: 'DTCP approved',
        approvalAuthority: 'DTCP',
        reraNumber: 'TN/01/Layout/0088/2021',
        occupancyCertificate: 'Available',
        pattaStatus: 'Patta available',
        titleChainStatus: 'Reviewed by lawyer',
        encumbranceCertificate: 'Verified clear',
        propertyTaxStatus: 'Receipts available, no known dues',
        possessionTimeline: 'Ready to occupy',
        tenancyStatus: 'Owner occupied',
        loanEligibility: 'Bank loan possible (verify)',
        negotiability: 'Open to offer',
        brokerageTerms: '2% standard',
        siteVisitTiming: 'Prior 24h notice required',
        floodAndRiskNotes: 'Natural sand aquifer with clear drainage towards sea, no storm water stagnation.',

        ownerName: 'Anand Chandrasekar',
        ownerPhone: '+91 98402 77112',
        ownerEmail: 'anand.c@realty.com',
        listingStatus: 'Available',
        photos: [
          'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
        ],
        assignedAgentId: 'agent-rajesh-admin-01',
        assignedAgentName: 'Rajesh Kumar',
        createdAt: Date.now() - 86400000 * 7,
        updatedAt: Date.now() - 86400000 * 2,
        viewCount: 312
      },
      {
        id: 'prop-adyar-03',
        title: 'Ceebros Boulevard 3 BHK River-View Flat',
        propertyType: 'Apartment',
        transactionType: 'Rent',
        locality: 'Adyar',
        subLocation: 'Gandhi Nagar',
        city: 'Chennai',
        bhk: 3,
        builtUpAreaSqFt: 2150,
        carpetAreaSqFt: 1780,
        superBuiltUpAreaSqFt: 2150,
        udsSqFt: 710,
        priceLakhs: 0.95, // 95,000 rent per month
        priceType: 'Total price',
        priceInclusions: 'Parking / amenities included',
        maintenanceMonthlyINR: 7500,
        furnishing: 'Fully Furnished',
        facing: 'East',
        floorNumber: 6,
        totalFloors: 14,
        floorPreferenceDetail: 'Middle floors',
        balconies: '2 balconies',
        bathrooms: '3 bathrooms',
        buildingAge: '2–5 years',
        carParkingCount: 2,
        parkingType: 'Covered car parking',
        parkingCountDetail: '2 cars',
        liftFacility: 'Passenger + service lift',
        waterSource: 'Metro + borewell',
        drainage: 'UGD / municipal sewer',
        floodHistory: 'No known issue — verify locally',
        powerBackup: 'Full backup',
        metroDistanceKm: 1.8,
        commutePriority: 'Schools & hospitals',
        amenities: ['River View Balcony', 'Clubhouse', 'Gym', '24/7 Security', 'Power backup', 'CCTV', 'Lift'],

        verificationStatus: 'Verified',
        approvalStatus: 'CMDA approved',
        approvalAuthority: 'CMDA',
        reraNumber: 'TN/01/Building/0342/2018',
        occupancyCertificate: 'Available',
        pattaStatus: 'Patta available',
        titleChainStatus: 'Reviewed by lawyer',
        encumbranceCertificate: 'Verified clear',
        propertyTaxStatus: 'Receipts available, no known dues',
        possessionTimeline: 'Ready to occupy',
        tenancyStatus: 'Vacant possession',
        loanEligibility: 'Bank loan possible (verify)',
        negotiability: 'Fixed price',
        brokerageTerms: '1 month rent',
        siteVisitTiming: 'Any weekday 4 PM - 7 PM',
        floodAndRiskNotes: 'Constructed on elevated land above high-flood levels. High compound wall.',

        ownerName: 'Dr. Meenakshi S.',
        ownerPhone: '+91 98418 33219',
        ownerEmail: 'dr.meenakshi@apollo.in',
        listingStatus: 'Available',
        photos: [
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80'
        ],
        assignedAgentId: 'agent-priya-mgr-02',
        assignedAgentName: 'Priya Sundaram',
        createdAt: Date.now() - 86400000 * 3,
        updatedAt: Date.now() - 86400000 * 1,
        viewCount: 194
      },
      {
        id: 'prop-annanagar-04',
        title: 'Appaswamy Trellis 2.5 BHK Premium Community',
        propertyType: 'Apartment',
        transactionType: 'Sale',
        locality: 'Anna Nagar',
        subLocation: 'Near Tower Park',
        city: 'Chennai',
        bhk: 2,
        builtUpAreaSqFt: 1320,
        carpetAreaSqFt: 1040,
        superBuiltUpAreaSqFt: 1320,
        udsSqFt: 460,
        priceLakhs: 165,
        priceType: 'Total price',
        priceInclusions: 'Base price only',
        maintenanceMonthlyINR: 4200,
        furnishing: 'Semi-Furnished',
        facing: 'North',
        floorNumber: 4,
        totalFloors: 12,
        floorPreferenceDetail: 'Middle floors',
        balconies: '1 balcony',
        bathrooms: '2 bathrooms',
        buildingAge: '6–10 years',
        carParkingCount: 1,
        parkingType: 'Covered car parking',
        parkingCountDetail: '1 car',
        liftFacility: 'Passenger + service lift',
        waterSource: 'Metro water',
        drainage: 'UGD / municipal sewer',
        floodHistory: 'No known issue — verify locally',
        powerBackup: 'Common-area backup only',
        metroDistanceKm: 0.8,
        commutePriority: 'Metro access',
        amenities: ['Gym', 'Children\'s play area', '24/7 Security', 'Covered Parking', 'Power backup', 'Lift'],

        verificationStatus: 'Verified',
        approvalStatus: 'CMDA approved',
        approvalAuthority: 'CMDA',
        reraNumber: 'TN/01/Building/0112/2016',
        occupancyCertificate: 'Available',
        pattaStatus: 'Patta available',
        titleChainStatus: 'Reviewed by lawyer',
        encumbranceCertificate: 'Verified clear',
        propertyTaxStatus: 'Receipts available, no known dues',
        possessionTimeline: 'Under construction',
        tenancyStatus: 'Owner occupied',
        loanEligibility: 'Bank loan possible (verify)',
        negotiability: 'Negotiable',
        brokerageTerms: '2% standard',
        siteVisitTiming: 'Sunday mornings 10 AM - 1 PM',
        floodAndRiskNotes: 'Prime central Anna Nagar avenue with municipal storm drains.',

        ownerName: 'K. Balasubramanian',
        ownerPhone: '+91 94441 55667',
        listingStatus: 'Under negotiation',
        photos: [
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
        ],
        assignedAgentId: 'agent-priya-mgr-02',
        assignedAgentName: 'Priya Sundaram',
        createdAt: Date.now() - 86400000 * 10,
        updatedAt: Date.now() - 86400000 * 2,
        viewCount: 265
      },
      {
        id: 'prop-velachery-05',
        title: 'Purva Windermere 2 BHK Ready to Move',
        propertyType: 'Apartment',
        transactionType: 'Sale',
        locality: 'Velachery',
        subLocation: 'Pallikaranai High Road',
        city: 'Chennai',
        bhk: 2,
        builtUpAreaSqFt: 1240,
        carpetAreaSqFt: 980,
        superBuiltUpAreaSqFt: 1240,
        udsSqFt: 420,
        priceLakhs: 78,
        priceType: 'Total price',
        priceInclusions: 'All-in cost confirmed in writing',
        maintenanceMonthlyINR: 3500,
        furnishing: 'Unfurnished',
        facing: 'East',
        floorNumber: 7,
        totalFloors: 15,
        floorPreferenceDetail: 'Middle floors',
        balconies: '1 balcony',
        bathrooms: '2 bathrooms',
        buildingAge: '2–5 years',
        carParkingCount: 1,
        parkingType: 'Covered car parking',
        parkingCountDetail: '1 car',
        liftFacility: 'Required / available',
        waterSource: 'Metro + borewell',
        drainage: 'UGD / municipal sewer',
        floodHistory: 'No known issue — verify locally',
        powerBackup: 'Full backup',
        metroDistanceKm: 2.4,
        commutePriority: 'OMR / IT corridor',
        amenities: ['Clubhouse', 'Gym', 'Jogging Track', 'Power backup', 'Lift', '24/7 Security'],

        verificationStatus: 'Verified',
        approvalStatus: 'CMDA approved',
        approvalAuthority: 'CMDA',
        reraNumber: 'TN/01/Building/0254/2019',
        occupancyCertificate: 'Available',
        pattaStatus: 'Patta available',
        titleChainStatus: 'Reviewed by lawyer',
        encumbranceCertificate: 'Verified clear',
        propertyTaxStatus: 'Receipts available, no known dues',
        possessionTimeline: 'Ready to occupy',
        tenancyStatus: 'Vacant possession',
        loanEligibility: 'Bank loan possible (verify)',
        negotiability: 'Negotiable',
        brokerageTerms: '2% standard',
        siteVisitTiming: 'Any day after 10 AM',
        floodAndRiskNotes: 'Built on elevated ground outside natural lake catchments. Water pump system installed.',

        ownerName: 'Muruganandam P.',
        ownerPhone: '+91 98845 22199',
        listingStatus: 'Available',
        photos: [
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'
        ],
        assignedAgentId: 'agent-karthik-03',
        assignedAgentName: 'Karthik Raman',
        createdAt: Date.now() - 86400000 * 4,
        updatedAt: Date.now() - 86400000 * 1,
        viewCount: 180
      }
    ];

    const seedLeads: LeadCRM[] = [
      {
        id: 'lead-01',
        name: 'Senthil Nathan',
        phone: '+91 98408 11223',
        altPhone: '+91 98408 11224',
        email: 'senthil.nathan@zoho.com',
        leadType: 'Buyer',
        stage: 'Site Visit Scheduled',
        priority: 'High',
        source: 'Website Form',
        preferredLocalities: ['OMR', 'Velachery', 'Perungudi'],
        preferredPropertyType: 'Apartment',
        preferredBhk: 3,
        purpose: 'Self-use',
        budgetMinLakhs: 120,
        budgetMaxLakhs: 150,
        preferredFacing: 'East',
        minBuiltUpSqFt: 1500,
        minCarpetSqFt: 1200,
        minUdsSqFt: 500,
        requiredBalconies: '2 balconies',
        requiredBathrooms: '3 bathrooms',
        preferredAge: '2–5 years',
        liftRequired: 'Required / available',
        parkingRequired: 'Covered car parking',
        waterSourcePreference: 'Metro + borewell',
        drainagePreference: 'UGD / municipal sewer',
        floodPreference: 'No known issue — verify locally',
        powerBackupPreference: 'Full backup',
        commutePriority: 'OMR / IT corridor',
        requiredApproval: 'CMDA approved',
        timeline: 'Immediate (0–30 days)',
        fundingReadiness: 'Loan pre-approved',
        decisionMakerConfirmed: 'Yes',
        amenitiesPreferred: ['Swimming Pool', 'Clubhouse', 'Gym', '24/7 Security', 'Power Backup'],
        assignedAgentId: 'agent-karthik-03',
        assignedAgentName: 'Karthik Raman',
        notes: 'Senior Tech Lead at Zoho Estancia. Looking for 3 BHK ready-to-move within 30 mins drive to OMR with Metro water & CMDA approval.',
        lastContactDate: Date.now() - 86400000 * 1,
        nextFollowUpDate: Date.now() + 86400000 * 1,
        matchedPropertyIds: ['prop-omr-01'],
        dealValueLakhs: 142,
        expectedCommissionINR: 284000
      },
      {
        id: 'lead-02',
        name: 'Varun K. & Deepa Varun',
        phone: '+91 98840 99887',
        altPhone: '+65 9123 4567',
        email: 'varun.deepa@gmail.com',
        leadType: 'Buyer',
        stage: 'In Negotiation',
        priority: 'Urgent',
        source: 'Referral',
        preferredLocalities: ['ECR', 'Adyar'],
        preferredPropertyType: 'Villa',
        preferredBhk: 4,
        purpose: 'Self-use',
        budgetMinLakhs: 400,
        budgetMaxLakhs: 500,
        preferredFacing: 'North-East',
        minBuiltUpSqFt: 3000,
        minUdsSqFt: 2000,
        requiredBalconies: '3+ balconies',
        requiredBathrooms: '4+ bathrooms',
        preferredAge: '0–1 year',
        liftRequired: 'Required / available',
        parkingRequired: 'Covered car parking',
        waterSourcePreference: 'Borewell',
        floodPreference: 'No known issue — verify locally',
        powerBackupPreference: 'Full backup',
        commutePriority: 'Quiet residential street',
        requiredApproval: 'DTCP approved',
        timeline: '1–3 months',
        fundingReadiness: 'Funds ready',
        decisionMakerConfirmed: 'Family / partner involved',
        amenitiesPreferred: ['Private Garden', 'Swimming pool', 'Solar Backup', '24/7 Gated Security'],
        assignedAgentId: 'agent-rajesh-admin-01',
        assignedAgentName: 'Rajesh Kumar',
        notes: 'HNIs relocating from Singapore. Inspected Uthandi villa. Offered ₹4.6 Cr against ₹4.85 Cr asking. Title verified.',
        lastContactDate: Date.now() - 86400000 * 1,
        nextFollowUpDate: Date.now() + 86400000 * 2,
        matchedPropertyIds: ['prop-ecr-02'],
        dealValueLakhs: 470,
        expectedCommissionINR: 940000
      },
      {
        id: 'lead-03',
        name: 'Ashwin Chidambaram',
        phone: '+91 98412 77665',
        email: 'ashwin.c@cognizant.com',
        leadType: 'Tenant',
        stage: 'Qualified',
        priority: 'Medium',
        source: '99acres',
        preferredLocalities: ['Adyar', 'Besant Nagar', 'Thiruvanmiyur'],
        preferredPropertyType: 'Apartment',
        preferredBhk: 3,
        purpose: 'Rental income',
        budgetMinLakhs: 0.8,
        budgetMaxLakhs: 1.1,
        preferredFacing: 'East',
        minBuiltUpSqFt: 1800,
        liftRequired: 'Required / available',
        parkingRequired: 'Covered car parking',
        waterSourcePreference: 'Metro + borewell',
        timeline: 'Immediate (0–30 days)',
        fundingReadiness: 'Funds ready',
        decisionMakerConfirmed: 'Yes',
        amenitiesPreferred: ['River View Balcony', 'Clubhouse', 'Gym', '24/7 Security'],
        assignedAgentId: 'agent-priya-mgr-02',
        assignedAgentName: 'Priya Sundaram',
        notes: 'Expats VP at Cognizant. Needs river-view or beach vicinity fully furnished apartment.',
        lastContactDate: Date.now() - 86400000 * 2,
        nextFollowUpDate: Date.now() + 86400000 * 1,
        matchedPropertyIds: ['prop-adyar-03'],
        dealValueLakhs: 1.0,
        expectedCommissionINR: 95000
      },
      {
        id: 'lead-04',
        name: 'Gopinath V. (Auditor)',
        phone: '+91 94440 88214',
        email: 'gopinath.ca@yahoo.com',
        leadType: 'Buyer',
        stage: 'Closed Won',
        priority: 'High',
        source: 'Walk-in',
        preferredLocalities: ['Anna Nagar', 'Kilpauk'],
        preferredPropertyType: 'Apartment',
        preferredBhk: 2,
        purpose: 'Self-use',
        budgetMinLakhs: 150,
        budgetMaxLakhs: 175,
        minBuiltUpSqFt: 1200,
        minUdsSqFt: 400,
        timeline: 'Immediate (0–30 days)',
        fundingReadiness: 'Loan pre-approved',
        decisionMakerConfirmed: 'Yes',
        assignedAgentId: 'agent-priya-mgr-02',
        assignedAgentName: 'Priya Sundaram',
        notes: 'Deal closed for Appaswamy Trellis flat. Registration completed at Sub-Registrar office.',
        lastContactDate: Date.now() - 86400000 * 3,
        nextFollowUpDate: Date.now() + 86400000 * 15,
        matchedPropertyIds: ['prop-annanagar-04'],
        dealValueLakhs: 165,
        expectedCommissionINR: 330000,
        collectedCommissionINR: 330000
      }
    ];

    const seedVisits: SiteVisit[] = [
      {
        id: 'visit-01',
        propertyId: 'prop-omr-01',
        propertyTitle: 'Prestige Courtyards 3 BHK Luxury High-Rise',
        locality: 'OMR',
        leadId: 'lead-01',
        leadName: 'Senthil Nathan',
        leadPhone: '+91 98408 11223',
        agentId: 'agent-karthik-03',
        agentName: 'Karthik Raman',
        scheduledTime: Date.now() + 86400000 * 1 + 3600000 * 4,
        status: 'Scheduled',
        feedbackNotes: 'Buyer interested in 11th floor cross-ventilation, UDS share and clubhouse access.',
        interestLevel: 'Hot'
      },
      {
        id: 'visit-02',
        propertyId: 'prop-ecr-02',
        propertyTitle: 'Sea-Facing 4 BHK Gated Villa on ECR',
        locality: 'ECR',
        leadId: 'lead-02',
        leadName: 'Varun K. & Deepa Varun',
        leadPhone: '+91 98840 99887',
        agentId: 'agent-rajesh-admin-01',
        agentName: 'Rajesh Kumar',
        scheduledTime: Date.now() - 86400000 * 2,
        status: 'Completed',
        feedbackNotes: 'Client visited with architect. Positive on foundation & beach access. Negotiation underway.',
        interestLevel: 'Hot'
      }
    ];

    this.properties.set(seedProperties);
    this.leads.set(seedLeads);
    this.siteVisits.set(seedVisits);
    this.saveData();
  }

  private saveData(): void {
    localStorage.setItem(STORAGE_KEY_PROPERTIES, JSON.stringify(this.properties()));
    localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(this.leads()));
    localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(this.siteVisits()));
    localStorage.setItem(STORAGE_KEY_ACTIVE_AGENT, JSON.stringify(this.activeAgent()));
  }

  // Active agent switcher (Admin, Manager, Agent)
  public switchAgent(agent: AgentProfile): void {
    this.activeAgent.set(agent);
    localStorage.setItem(STORAGE_KEY_ACTIVE_AGENT, JSON.stringify(agent));
    this.notify(`Switched active agent persona to ${agent.name} (${agent.role.toUpperCase()})`, 'info');
  }

  // Duplicate Listing Detection
  public checkDuplicateListing(locality: ChennaiLocality, bhk: number | string, builtUpArea: number, excludeId?: string): { isDuplicate: boolean; matchedProperty?: PropertyListing } {
    const margin = 0.05; // 5% area variance
    const minArea = builtUpArea * (1 - margin);
    const maxArea = builtUpArea * (1 + margin);

    const match = this.properties().find(p => 
      p.id !== excludeId &&
      p.locality === locality &&
      String(p.bhk) === String(bhk) &&
      p.builtUpAreaSqFt >= minArea &&
      p.builtUpAreaSqFt <= maxArea
    );

    return {
      isDuplicate: !!match,
      matchedProperty: match
    };
  }

  // Save / Update Property Listing (Seller data)
  public saveProperty(propertyData: Partial<PropertyListing>): boolean {
    const existingId = propertyData.id;

    if (existingId) {
      this.properties.update(list => 
        list.map(p => p.id === existingId ? { ...p, ...propertyData, updatedAt: Date.now() } as PropertyListing : p)
      );
      this.saveData();
      this.notify('Property listing updated successfully!', 'success');
      return true;
    }

    // Check Duplicate
    const dupCheck = this.checkDuplicateListing(
      propertyData.locality || 'OMR',
      propertyData.bhk || 2,
      propertyData.builtUpAreaSqFt || 1200
    );

    const newProp: PropertyListing = {
      id: 'prop-' + Date.now().toString(36),
      title: propertyData.title || `${propertyData.bhk || 2} BHK ${propertyData.propertyType || 'Apartment'} in ${propertyData.locality || 'Chennai'}`,
      propertyType: propertyData.propertyType || 'Apartment',
      transactionType: propertyData.transactionType || 'Sale',
      locality: propertyData.locality || 'OMR',
      subLocation: propertyData.subLocation || '',
      city: 'Chennai',
      bhk: propertyData.bhk || 2,
      builtUpAreaSqFt: propertyData.builtUpAreaSqFt || 1200,
      carpetAreaSqFt: propertyData.carpetAreaSqFt || Math.round((propertyData.builtUpAreaSqFt || 1200) * 0.78),
      superBuiltUpAreaSqFt: propertyData.superBuiltUpAreaSqFt || propertyData.builtUpAreaSqFt || 1200,
      udsSqFt: propertyData.udsSqFt || Math.round((propertyData.builtUpAreaSqFt || 1200) * 0.35),
      priceLakhs: propertyData.priceLakhs || 90,
      priceType: propertyData.priceType || 'Total price',
      priceInclusions: propertyData.priceInclusions || 'All-in cost confirmed in writing',
      maintenanceMonthlyINR: propertyData.maintenanceMonthlyINR || 3500,
      furnishing: propertyData.furnishing || 'Semi-Furnished',
      facing: propertyData.facing || 'East',
      floorNumber: propertyData.floorNumber || 3,
      totalFloors: propertyData.totalFloors || 10,
      floorPreferenceDetail: propertyData.floorPreferenceDetail || 'Middle floors',
      balconies: propertyData.balconies || '1 balcony',
      bathrooms: propertyData.bathrooms || '2 bathrooms',
      buildingAge: propertyData.buildingAge || '2–5 years',
      carParkingCount: propertyData.carParkingCount || 1,
      parkingType: propertyData.parkingType || 'Covered car parking',
      parkingCountDetail: propertyData.parkingCountDetail || '1 car',
      liftFacility: propertyData.liftFacility || 'Required / available',
      waterSource: propertyData.waterSource || 'Metro + borewell',
      drainage: propertyData.drainage || 'UGD / municipal sewer',
      floodHistory: propertyData.floodHistory || 'No known issue — verify locally',
      powerBackup: propertyData.powerBackup || 'Full backup',
      metroDistanceKm: propertyData.metroDistanceKm || 1.5,
      commutePriority: propertyData.commutePriority || 'Metro access',
      amenities: propertyData.amenities || ['Security', 'Covered Parking', 'Lift', 'Power Backup'],
      verificationStatus: propertyData.verificationStatus || 'Verified',
      approvalStatus: propertyData.approvalStatus || 'CMDA approved',
      approvalAuthority: propertyData.approvalAuthority || 'CMDA',
      reraNumber: propertyData.reraNumber || '',
      occupancyCertificate: propertyData.occupancyCertificate || 'Available',
      pattaStatus: propertyData.pattaStatus || 'Patta available',
      titleChainStatus: propertyData.titleChainStatus || 'Reviewed by lawyer',
      encumbranceCertificate: propertyData.encumbranceCertificate || 'Verified clear',
      propertyTaxStatus: propertyData.propertyTaxStatus || 'Receipts available, no known dues',
      possessionTimeline: propertyData.possessionTimeline || 'Ready to occupy',
      tenancyStatus: propertyData.tenancyStatus || 'Vacant possession',
      loanEligibility: propertyData.loanEligibility || 'Bank loan possible (verify)',
      negotiability: propertyData.negotiability || 'Negotiable',
      brokerageTerms: propertyData.brokerageTerms || '2% agreed',
      siteVisitTiming: propertyData.siteVisitTiming || 'Weekends after 11 AM',
      floodAndRiskNotes: propertyData.floodAndRiskNotes || '',
      notes: propertyData.notes || '',
      listingStatus: propertyData.listingStatus || 'Available',
      ownerName: propertyData.ownerName || 'Property Owner',
      ownerPhone: propertyData.ownerPhone || '+91 98400 00000',
      ownerAltPhone: propertyData.ownerAltPhone,
      ownerEmail: propertyData.ownerEmail,
      photos: propertyData.photos && propertyData.photos.length > 0 ? propertyData.photos : [
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
      ],
      assignedAgentId: this.activeAgent().uid,
      assignedAgentName: this.activeAgent().name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDuplicate: dupCheck.isDuplicate,
      duplicateOfId: dupCheck.matchedProperty?.id,
      viewCount: 1
    };

    if (dupCheck.isDuplicate) {
      this.notify(`Warning: Possible duplicate listing flagged against #${dupCheck.matchedProperty?.id}`, 'info');
    }

    this.properties.update(list => [newProp, ...list]);
    this.saveData();
    this.notify('Property listing added to SkyPearl Inventory!', 'success');
    return true;
  }

  public deleteProperty(id: string): void {
    if (!this.isAdmin() && !this.isManager()) {
      this.notify('Permission Denied. Only Admin or Manager can delete properties.', 'error');
      return;
    }
    this.properties.update(list => list.filter(p => p.id !== id));
    this.saveData();
    this.notify('Property listing deleted from inventory.', 'info');
  }

  // Save / Update Lead (Buyer / Client requirement)
  public saveLead(leadData: Partial<LeadCRM>): boolean {
    const existingId = leadData.id;

    if (existingId) {
      this.leads.update(list =>
        list.map(l => l.id === existingId ? { ...l, ...leadData } as LeadCRM : l)
      );
      this.saveData();
      this.notify('Customer requirement updated.', 'success');
      return true;
    }

    // Auto-calculate expected commission
    const dealVal = leadData.budgetMaxLakhs || 100;
    const isRental = leadData.leadType === 'Tenant';
    const commissionINR = isRental 
      ? Math.round(dealVal * 100000) 
      : Math.round(dealVal * 100000 * 0.02);

    const newLead: LeadCRM = {
      id: 'lead-' + Date.now().toString(36),
      name: leadData.name || 'Prospective Client',
      phone: leadData.phone || '+91 98400 11111',
      altPhone: leadData.altPhone,
      email: leadData.email || 'client@example.com',
      leadType: leadData.leadType || 'Buyer',
      stage: leadData.stage || 'New',
      priority: leadData.priority || 'Medium',
      source: leadData.source || 'Website Form',
      assignedAgentId: this.activeAgent().uid,
      assignedAgentName: this.activeAgent().name,
      preferredLocalities: leadData.preferredLocalities && leadData.preferredLocalities.length > 0 ? leadData.preferredLocalities : ['OMR'],
      preferredPropertyType: leadData.preferredPropertyType || 'Apartment',
      preferredBhk: leadData.preferredBhk || 2,
      purpose: leadData.purpose || 'Self-use',
      budgetMinLakhs: leadData.budgetMinLakhs || 60,
      budgetMaxLakhs: leadData.budgetMaxLakhs || 120,
      priceType: leadData.priceType || 'Total price',
      preferredFacing: leadData.preferredFacing,
      preferredFloor: leadData.preferredFloor,
      preferredFloorDetail: leadData.preferredFloorDetail,
      minBuiltUpSqFt: leadData.minBuiltUpSqFt,
      minCarpetSqFt: leadData.minCarpetSqFt,
      minUdsSqFt: leadData.minUdsSqFt,
      requiredBalconies: leadData.requiredBalconies,
      requiredBathrooms: leadData.requiredBathrooms,
      preferredAge: leadData.preferredAge,
      liftRequired: leadData.liftRequired,
      parkingRequired: leadData.parkingRequired,
      parkingCountRequired: leadData.parkingCountRequired,
      furnishingPreferred: leadData.furnishingPreferred,
      waterSourcePreference: leadData.waterSourcePreference,
      drainagePreference: leadData.drainagePreference,
      floodPreference: leadData.floodPreference,
      powerBackupPreference: leadData.powerBackupPreference,
      commutePriority: leadData.commutePriority,
      amenitiesPreferred: leadData.amenitiesPreferred || [],
      requiredApproval: leadData.requiredApproval,
      loanReadiness: leadData.loanReadiness,
      timeline: leadData.timeline || '1–3 months',
      fundingReadiness: leadData.fundingReadiness || 'Funds ready',
      decisionMakerConfirmed: leadData.decisionMakerConfirmed || 'Yes',
      notes: leadData.notes || '',
      lastContactDate: Date.now(),
      nextFollowUpDate: leadData.nextFollowUpDate || (Date.now() + 86400000 * 2),
      matchedPropertyIds: [],
      dealValueLakhs: dealVal,
      expectedCommissionINR: commissionINR
    };

    // Calculate initial matches
    const matches = this.properties()
      .map(p => ({ property: p, score: this.calculateCompatibilityScore(newLead, p).score }))
      .filter(m => m.score >= 50);
    newLead.matchedPropertyIds = matches.map(m => m.property.id);

    this.leads.update(list => [newLead, ...list]);
    this.saveData();
    this.notify('New Client Lead added to SkyPearl CRM pipeline!', 'success');
    return true;
  }

  public deleteLead(id: string): void {
    if (!this.isAdmin() && !this.isManager()) {
      this.notify('Permission Denied. Only Admin or Manager can delete client records.', 'error');
      return;
    }
    this.leads.update(list => list.filter(l => l.id !== id));
    this.saveData();
    this.notify('Client record deleted.', 'info');
  }

  public updateLeadStage(leadId: string, stage: LeadStage): void {
    this.leads.update(list =>
      list.map(l => {
        if (l.id === leadId) {
          const isWon = stage === 'Closed Won';
          return {
            ...l,
            stage,
            collectedCommissionINR: isWon ? (l.expectedCommissionINR || 0) : l.collectedCommissionINR,
            lastContactDate: Date.now()
          };
        }
        return l;
      })
    );
    this.saveData();
    this.notify(`Lead stage updated to ${stage}`, 'info');
  }

  // 16-Dimension Weighted Compatibility Engine (Identical to SkyPearl Realty OS Advanced algorithm)
  public calculateCompatibilityScore(buyer: LeadCRM, property: PropertyListing): { score: number; why: string[]; miss: string[] } {
    let score = 0;
    let max = 0;
    const why: string[] = [];
    const miss: string[] = [];

    const add = (label: string, weight: number, ok: boolean, known = true) => {
      if (!known) return;
      max += weight;
      if (ok) {
        score += weight;
        why.push(label);
      } else {
        miss.push(label);
      }
    };

    const same = (x: any, y: any) => !!x && !!y && String(x).toLowerCase().trim() === String(y).toLowerCase().trim();
    const nn = (x: any, y: any) => x != null && y != null && !isNaN(Number(x)) && !isNaN(Number(y));

    // 1. Property type (16 pts)
    const typeKnown = !!buyer.preferredPropertyType && !!property.propertyType;
    add('Property type', 16, same(buyer.preferredPropertyType, property.propertyType), typeKnown);

    // 2. Locality / micro-market (18 pts)
    const buyerLocalities = buyer.preferredLocalities || [];
    const localMatch = buyerLocalities.length === 0 || buyerLocalities.some(loc => 
      same(loc, property.locality) || 
      property.subLocation.toLowerCase().includes(loc.toLowerCase())
    );
    add('Locality / micro-market', 18, localMatch, buyerLocalities.length > 0);

    // 3. Budget (18 pts)
    const propPrice = property.priceLakhs;
    const maxB = buyer.budgetMaxLakhs;
    const minB = buyer.budgetMinLakhs;
    const budgetKnown = maxB != null && propPrice != null;
    const budgetOk = propPrice <= maxB * 1.05 && (!minB || propPrice >= minB * 0.85);
    add('Budget match', 18, budgetOk, budgetKnown);

    // 4. BHK (10 pts)
    const bhkKnown = !!buyer.preferredBhk && !!property.bhk;
    const bhkOk = String(buyer.preferredBhk) === String(property.bhk);
    add('BHK layout', 10, bhkOk, bhkKnown);

    // 5. Facing (5 pts)
    const facingKnown = !!buyer.preferredFacing && !!property.facing && buyer.preferredFacing !== 'No preference / not known';
    add('Facing', 5, same(buyer.preferredFacing, property.facing), facingKnown);

    // 6. Built-up area (7 pts)
    const builtKnown = nn(buyer.minBuiltUpSqFt, property.builtUpAreaSqFt);
    add('Built-up area', 7, property.builtUpAreaSqFt >= (buyer.minBuiltUpSqFt || 0) * 0.9, builtKnown);

    // 7. Carpet area (5 pts)
    const carpetKnown = nn(buyer.minCarpetSqFt, property.carpetAreaSqFt);
    add('Carpet area', 5, (property.carpetAreaSqFt || 0) >= (buyer.minCarpetSqFt || 0) * 0.9, carpetKnown);

    // 8. UDS (4 pts)
    const udsKnown = nn(buyer.minUdsSqFt, property.udsSqFt);
    add('UDS (Land share)', 4, (property.udsSqFt || 0) >= (buyer.minUdsSqFt || 0), udsKnown);

    // 9. Floor preference (4 pts)
    const floorPref = buyer.preferredFloorDetail || buyer.preferredFloor;
    const propFloorPref = property.floorPreferenceDetail || String(property.floorNumber);
    const floorKnown = !!floorPref && !!propFloorPref && floorPref !== 'No preference';
    add('Floor preference', 4, same(floorPref, propFloorPref), floorKnown);

    // 10. Lift (3 pts)
    const liftKnown = !!buyer.liftRequired && !!property.liftFacility && buyer.liftRequired !== 'No preference / not known';
    add('Lift facility', 3, same(buyer.liftRequired, property.liftFacility), liftKnown);

    // 11. Approval status (7 pts)
    const appKnown = !!buyer.requiredApproval && !!property.approvalStatus && buyer.requiredApproval !== 'Not verified';
    add('Approval (CMDA/DTCP/RERA)', 7, same(buyer.requiredApproval, property.approvalStatus), appKnown);

    // 12. Water source (3 pts)
    const waterKnown = !!buyer.waterSourcePreference && !!property.waterSource && buyer.waterSourcePreference !== 'Not specified';
    add('Water source (Metro/Borewell)', 3, same(buyer.waterSourcePreference, property.waterSource), waterKnown);

    // 13. Flood / waterlogging (4 pts)
    const floodKnown = !!buyer.floodPreference && !!property.floodHistory && buyer.floodPreference !== 'Not checked';
    add('Flood safety history', 4, same(buyer.floodPreference, property.floodHistory), floodKnown);

    // 14. Parking (3 pts)
    const parkKnown = !!buyer.parkingRequired && !!property.parkingType && buyer.parkingRequired !== 'No preference / not known';
    add('Car parking', 3, same(buyer.parkingRequired, property.parkingType), parkKnown);

    // 15. Amenities (4 pts)
    const buyerAmen = buyer.amenitiesPreferred || [];
    const propAmen = property.amenities || [];
    const amenKnown = buyerAmen.length > 0 && propAmen.length > 0;
    const matchedAmen = buyerAmen.filter(a => propAmen.includes(a));
    add('Amenities overlap', 4, matchedAmen.length > 0, amenKnown);

    // 16. Commute priority (3 pts)
    const commuteKnown = !!buyer.commutePriority && !!property.commutePriority && buyer.commutePriority !== 'No preference';
    add('Commute priority', 3, same(buyer.commutePriority, property.commutePriority), commuteKnown);

    const calculatedPercent = max > 0 ? Math.round((score / max) * 100) : 0;
    return {
      score: calculatedPercent,
      why,
      miss
    };
  }

  // Calculate all buyer <-> property connection pairs
  public calculateAllMatches(): CompatibilityMatch[] {
    const buyers = this.leads().filter(l => l.stage !== 'Closed Lost' && l.stage !== 'Closed Won');
    const availableProps = this.properties().filter(p => p.listingStatus === 'Available' || p.listingStatus === 'Active' || p.listingStatus === 'Under negotiation');
    const matches: CompatibilityMatch[] = [];

    buyers.forEach(buyer => {
      availableProps.forEach(property => {
        const result = this.calculateCompatibilityScore(buyer, property);
        if (result.score > 0) {
          matches.push({
            buyer,
            property,
            score: result.score,
            why: result.why,
            miss: result.miss
          });
        }
      });
    });

    return matches.sort((a, b) => b.score - a.score);
  }

  // Smart WhatsApp Message Generator
  public generateWhatsAppUrl(phone: string, text: string): string {
    let clean = phone.replace(/[^\d]/g, '');
    if (clean.length === 10) clean = '91' + clean;
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  }

  // Schedule Site Visit
  public scheduleVisit(visitData: Partial<SiteVisit>): boolean {
    const newVisit: SiteVisit = {
      id: 'visit-' + Date.now().toString(36),
      propertyId: visitData.propertyId || '',
      propertyTitle: visitData.propertyTitle || 'Property Visit',
      locality: visitData.locality || 'OMR',
      leadId: visitData.leadId || '',
      leadName: visitData.leadName || '',
      leadPhone: visitData.leadPhone || '',
      agentId: this.activeAgent().uid,
      agentName: this.activeAgent().name,
      scheduledTime: visitData.scheduledTime || (Date.now() + 86400000),
      status: 'Scheduled',
      feedbackNotes: visitData.feedbackNotes || '',
      interestLevel: visitData.interestLevel || 'Warm'
    };

    this.siteVisits.update(list => [newVisit, ...list]);
    
    // Automatically advance lead stage
    if (newVisit.leadId) {
      const lead = this.leads().find(l => l.id === newVisit.leadId);
      if (lead && (lead.stage === 'New' || lead.stage === 'Qualified' || lead.stage === 'Contacted')) {
        this.updateLeadStage(newVisit.leadId, 'Site Visit Scheduled');
      }
    }

    this.saveData();
    this.notify('Site visit scheduled successfully!', 'success');
    return true;
  }

  // Comprehensive CSV Exports matching SkyPearl Realty OS Advanced
  public exportPropertiesToCSV(): void {
    const headers = [
      'ID', 'Title', 'Type', 'Transaction', 'Locality', 'Landmark', 'BHK', 
      'BuiltUp SqFt', 'Carpet SqFt', 'SuperBuiltUp SqFt', 'UDS SqFt',
      'Price Lakhs INR', 'Price Basis', 'Price Inclusions', 'Maintenance Monthly INR',
      'Facing', 'Floor', 'Total Floors', 'Balconies', 'Bathrooms', 'Building Age',
      'Parking Type', 'Parking Count', 'Lift', 'Water Source', 'Drainage',
      'Flood History', 'Power Backup', 'Metro Dist Km', 'Commute Priority',
      'Approval Status', 'Approval Authority', 'TNRERA No', 'OC Certificate',
      'Patta Status', 'Title Parent Docs', 'EC Status', 'Property Tax',
      'Possession Timeline', 'Tenancy Status', 'Loan Eligibility', 'Negotiability',
      'Brokerage', 'Visit Timing', 'Risk Notes', 'Status', 'Owner Name', 'Owner Phone', 'Assigned Agent'
    ];

    const rows = this.properties().map(p => [
      p.id,
      `"${p.title.replace(/"/g, '""')}"`,
      p.propertyType,
      p.transactionType,
      p.locality,
      `"${(p.subLocation || '').replace(/"/g, '""')}"`,
      p.bhk,
      p.builtUpAreaSqFt,
      p.carpetAreaSqFt || '',
      p.superBuiltUpAreaSqFt || '',
      p.udsSqFt || '',
      p.priceLakhs,
      p.priceType || 'Total price',
      p.priceInclusions || '',
      p.maintenanceMonthlyINR || '',
      p.facing,
      p.floorNumber,
      p.totalFloors,
      p.balconies || '',
      p.bathrooms || '',
      p.buildingAge || '',
      p.parkingType || '',
      p.parkingCountDetail || '',
      p.liftFacility || '',
      p.waterSource || '',
      p.drainage || '',
      p.floodHistory || '',
      p.powerBackup || '',
      p.metroDistanceKm || '',
      p.commutePriority || '',
      p.approvalStatus || '',
      p.approvalAuthority || '',
      p.reraNumber || '',
      p.occupancyCertificate || '',
      p.pattaStatus || '',
      p.titleChainStatus || '',
      p.encumbranceCertificate || '',
      p.propertyTaxStatus || '',
      p.possessionTimeline || '',
      p.tenancyStatus || '',
      p.loanEligibility || '',
      p.negotiability || '',
      p.brokerageTerms || '',
      `"${(p.siteVisitTiming || '').replace(/"/g, '""')}"`,
      `"${(p.floodAndRiskNotes || '').replace(/"/g, '""')}"`,
      p.listingStatus,
      `"${p.ownerName}"`,
      this.canViewOwnerContacts() ? `"${p.ownerPhone}"` : '"[RESTRICTED]"',
      `"${p.assignedAgentName}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    this.downloadFile(csvContent, `skypearl_seller_inventory_${Date.now()}.csv`, 'text/csv');
    this.notify('Complete property inventory CSV exported successfully!', 'success');
  }

  public exportLeadsToCSV(): void {
    const headers = [
      'ID', 'Client Name', 'Phone', 'Alt Phone', 'Email', 'Type', 'Stage', 'Priority', 'Source',
      'Localities', 'Property Category', 'Preferred BHK', 'Purpose', 'Budget Min Lakhs', 'Budget Max Lakhs',
      'Preferred Facing', 'Min BuiltUp SqFt', 'Min UDS SqFt', 'Balconies', 'Bathrooms', 'Building Age',
      'Lift', 'Parking', 'Water Preference', 'Drainage Preference', 'Flood Preference',
      'Approval Required', 'Timeline', 'Funding Readiness', 'Decision Maker', 'Expected Commission INR', 'Agent'
    ];

    const rows = this.leads().map(l => [
      l.id,
      `"${l.name}"`,
      `"${l.phone}"`,
      `"${l.altPhone || ''}"`,
      `"${l.email}"`,
      l.leadType,
      l.stage,
      l.priority,
      l.source,
      `"${l.preferredLocalities.join('; ')}"`,
      l.preferredPropertyType,
      l.preferredBhk || '',
      l.purpose || '',
      l.budgetMinLakhs,
      l.budgetMaxLakhs,
      l.preferredFacing || '',
      l.minBuiltUpSqFt || '',
      l.minUdsSqFt || '',
      l.requiredBalconies || '',
      l.requiredBathrooms || '',
      l.preferredAge || '',
      l.liftRequired || '',
      l.parkingRequired || '',
      l.waterSourcePreference || '',
      l.drainagePreference || '',
      l.floodPreference || '',
      l.requiredApproval || '',
      l.timeline || '',
      l.fundingReadiness || '',
      l.decisionMakerConfirmed || '',
      l.expectedCommissionINR || 0,
      `"${l.assignedAgentName}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    this.downloadFile(csvContent, `skypearl_buyers_crm_${Date.now()}.csv`, 'text/csv');
    this.notify('Complete buyers CRM CSV exported successfully!', 'success');
  }

  public exportMatchesToCSV(): void {
    const matches = this.calculateAllMatches();
    const headers = ['Buyer Name', 'Buyer Phone', 'Property Title', 'Property Locality', 'Property Price Lakhs', 'Seller Name', 'Seller Phone', 'Match Score %', 'Matched Criteria', 'Gaps To Verify'];
    const rows = matches.map(m => [
      `"${m.buyer.name}"`,
      `"${m.buyer.phone}"`,
      `"${m.property.title}"`,
      `"${m.property.locality}"`,
      m.property.priceLakhs,
      `"${m.property.ownerName}"`,
      this.canViewOwnerContacts() ? `"${m.property.ownerPhone}"` : '"[RESTRICTED]"',
      m.score,
      `"${m.why.join('; ')}"`,
      `"${m.miss.join('; ')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    this.downloadFile(csvContent, `skypearl_compatibility_matches_${Date.now()}.csv`, 'text/csv');
    this.notify('Connections & matches CSV exported successfully!', 'success');
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  public notify(message: string, type: 'success' | 'info' | 'error'): void {
    this.notification.set({ message, type });
    setTimeout(() => {
      if (this.notification()?.message === message) {
        this.notification.set(null);
      }
    }, 4500);
  }
}
