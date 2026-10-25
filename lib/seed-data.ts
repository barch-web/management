import { Role, ServiceLine, type RBACConfig, DEFAULT_RBAC_CONFIG } from './rbac';
import { hashPassword, type UserAccount, type AuditLogEntry } from './auth-logic';

export interface ClientRecord {
  id: string;
  companyName: string;
  contactPerson: string;
  contactInfo: string;
  contractTier: string;
  activeSince: string;
}

export interface SiteRecord {
  id: string;
  clientId: string;
  siteName: string;
  address: string;
  serviceType: ServiceLine;
  supervisorId: string;
  assignedGuardIds: string[];
  riskLevel: 'Standard' | 'Elevated' | 'High' | 'Critical';
  riskNotes: string;
  cctvStatus: 'Online' | 'Maintenance Required' | 'Degraded' | 'Not Installed';
  activeCameras: number;
  requiredGuards: number;
}

export interface EmployeeRecord {
  id: string;
  userId: string;
  fullName: string;
  badgeNumber: string;
  role: Role;
  assignedSiteId: string;
  startDate: string;
  contractExpiry: string;
  siaLicenseExpiry: string;
  certifications: string[];
  clearanceLevel: string;
  hourlyRate: number;
}

export interface LeaveRequestRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: 'Annual Leave' | 'Medical Leave' | 'Training / Recertification' | 'Emergency Leave';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Declined';
}

export interface DisciplinaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  category: 'Uniform / Equipment Compliance' | 'Late Clock-In' | 'Protocol Deviation' | 'Commendation / Audit Note';
  description: string;
  actionTaken: string;
}

export interface ShiftRecord {
  id: string;
  siteId: string;
  guardId: string;
  guardName: string;
  startTime: string;
  endTime: string;
  postAssignment: string;
  status: 'Pending Approval' | 'Scheduled' | 'Active / On-Post' | 'Completed' | 'No-Show';
  clockIn?: string;
  clockOut?: string;
  geoTag?: string;
  hoursLogged: number;
}

export interface IncidentRecord {
  id: string;
  siteId: string;
  reportedBy: string;
  reporterName: string;
  type:
    | 'Perimeter Breach Attempt'
    | 'Unauthorized Access'
    | 'CCTV Feed Interruption'
    | 'CIT Route Deviation Alert'
    | 'Medical / Safety Response'
    | 'Asset Seal Tamper Check';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  attachments: string[];
  status: 'Open' | 'Under Supervisor Review' | 'Escalated to Command' | 'Resolved';
  escalatedTo?: string;
  clientVisible: boolean;
  occurredAt: string;
}

export interface CustodyLogStep {
  timestamp: string;
  checkpoint: string;
  custodian: string;
  sealCode: string;
  verified: boolean;
}

export interface CITJobRecord {
  id: string;
  jobCode: string;
  clientId: string;
  serviceLine: ServiceLine.CASH_IN_TRANSIT | ServiceLine.VALUABLE_TRANSPORT;
  pickup: string;
  dropoff: string;
  crewIds: string[];
  crewNames: string[];
  vehicle: string;
  valueCategory: 'Tier-1 High Value ($5M+)' | 'Tier-2 Commercial ($1M–$5M)' | 'Tier-3 Retail Bullion/Cash (<$1M)';
  status: 'Scheduled' | 'In Transit' | 'Vault Handover' | 'Completed';
  scheduledAt: string;
  chainOfCustody: CustodyLogStep[];
}

export interface CCTVJobRecord {
  id: string;
  jobCode: string;
  siteId: string;
  technicianId: string;
  technicianName: string;
  jobType: 'New Installation' | 'Preventive Maintenance' | 'Emergency Repair' | 'Firmware & NVR Audit';
  status: 'Assigned' | 'In Progress' | 'Pending Sign-Off' | 'Completed';
  equipmentUsed: string[];
  technicalNotes: string;
  scheduledDate: string;
  signedOffBy?: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  clientId: string;
  serviceLine: ServiceLine;
  amount: number;
  status: 'Draft' | 'Issued' | 'Paid' | 'Overdue';
  issuedDate: string;
  dueDate: string;
  billingPeriod: string;
}

export interface ExpenseRecord {
  id: string;
  category: 'Armored Fleet Fuel & Maintenance' | 'CCTV Hardware & NVRs' | 'Tactical Uniforms & Radios' | 'Licensing & Insurance';
  serviceLine: ServiceLine;
  description: string;
  amount: number;
  date: string;
}

export interface SystemState {
  rbacConfig: RBACConfig;
  accounts: UserAccount[];
  clients: ClientRecord[];
  sites: SiteRecord[];
  employees: EmployeeRecord[];
  leaveRequests: LeaveRequestRecord[];
  disciplinaryRecords: DisciplinaryRecord[];
  shifts: ShiftRecord[];
  incidents: IncidentRecord[];
  citJobs: CITJobRecord[];
  cctvJobs: CCTVJobRecord[];
  invoices: InvoiceRecord[];
  expenses: ExpenseRecord[];
  auditLogs: AuditLogEntry[];
}

export const INITIAL_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-dir-1',
    username: 'director.vance',
    passwordHash: hashPassword('Sentinel#2026', 'director.vance'),
    fullName: 'Marcus Vance',
    phone: '+44 20 7946 0101',
    role: Role.DIRECTOR,
    status: 'active',
    assignedSiteIds: ['site-1', 'site-2', 'site-3', 'site-4', 'site-5', 'site-6', 'site-7'],
    createdAt: '2026-01-10T08:00:00Z',
    lastLoginAt: '2026-10-25T07:45:00Z',
  },
  {
    id: 'usr-ops-1',
    username: 'ops.hale',
    passwordHash: hashPassword('Sentinel#2026', 'ops.hale'),
    fullName: 'Elena Hale',
    phone: '+44 20 7946 0102',
    role: Role.OPERATION_MANAGER,
    status: 'active',
    assignedSiteIds: ['site-1', 'site-2', 'site-3', 'site-4', 'site-5', 'site-6', 'site-7'],
    createdAt: '2026-01-12T08:30:00Z',
    lastLoginAt: '2026-10-25T08:10:00Z',
  },
  {
    id: 'usr-sup-1',
    username: 'sup.keller',
    passwordHash: hashPassword('Sentinel#2026', 'sup.keller'),
    fullName: 'David Keller',
    phone: '+44 20 7946 0103',
    role: Role.SUPERVISOR,
    status: 'active',
    assignedSiteIds: ['site-1', 'site-2', 'site-3', 'site-6'],
    createdAt: '2026-02-01T09:00:00Z',
    lastLoginAt: '2026-10-25T06:50:00Z',
  },
  {
    id: 'usr-acc-1',
    username: 'acct.lindqvist',
    passwordHash: hashPassword('Sentinel#2026', 'acct.lindqvist'),
    fullName: 'Soren Lindqvist',
    phone: '+44 20 7946 0104',
    role: Role.ACCOUNTANT,
    status: 'active',
    createdAt: '2026-02-04T09:00:00Z',
    lastLoginAt: '2026-10-24T17:15:00Z',
  },
  {
    id: 'usr-hr-1',
    username: 'hr.okafor',
    passwordHash: hashPassword('Sentinel#2026', 'hr.okafor'),
    fullName: 'Amara Okafor',
    phone: '+44 20 7946 0105',
    role: Role.HR_MANAGER,
    status: 'active',
    createdAt: '2026-02-10T09:00:00Z',
    lastLoginAt: '2026-10-25T08:00:00Z',
  },
  {
    id: 'usr-grd-1',
    username: 'guard.mercer',
    passwordHash: hashPassword('Sentinel#2026', 'guard.mercer'),
    fullName: 'Liam Mercer',
    phone: '+44 20 7946 0106',
    role: Role.GUARD,
    status: 'active',
    assignedSiteIds: ['site-1', 'site-3'],
    createdAt: '2026-03-01T07:00:00Z',
    lastLoginAt: '2026-10-25T05:55:00Z',
  },
  {
    id: 'usr-grd-2',
    username: 'guard.diaz',
    passwordHash: hashPassword('Sentinel#2026', 'guard.diaz'),
    fullName: 'Sofia Diaz',
    phone: '+44 20 7946 0112',
    role: Role.GUARD,
    status: 'active',
    assignedSiteIds: ['site-2', 'site-6'],
    createdAt: '2026-03-05T07:00:00Z',
    lastLoginAt: '2026-10-25T06:10:00Z',
  },
  {
    id: 'usr-tech-1',
    username: 'tech.patel',
    passwordHash: hashPassword('Sentinel#2026', 'tech.patel'),
    fullName: 'Vikram Patel',
    phone: '+44 20 7946 0107',
    role: Role.CCTV_TECHNICIAN,
    status: 'active',
    assignedSiteIds: ['site-1', 'site-2', 'site-5'],
    createdAt: '2026-03-10T08:00:00Z',
    lastLoginAt: '2026-10-25T07:20:00Z',
  },
  {
    id: 'usr-cli-1',
    username: 'client.apex',
    passwordHash: hashPassword('Sentinel#2026', 'client.apex'),
    fullName: 'Victoria Sterling (Apex Sovereign Vaults)',
    phone: '+44 20 7946 0108',
    role: Role.CLIENT,
    status: 'active',
    clientId: 'client-1',
    assignedSiteIds: ['site-1', 'site-5', 'site-7'],
    createdAt: '2026-03-15T10:00:00Z',
    lastLoginAt: '2026-10-24T14:30:00Z',
  },
  {
    id: 'usr-cli-2',
    username: 'client.northstar',
    passwordHash: hashPassword('Sentinel#2026', 'client.northstar'),
    fullName: 'Henrik Larsen (NorthStar Petrochemical)',
    phone: '+44 20 7946 0109',
    role: Role.CLIENT,
    status: 'active',
    clientId: 'client-2',
    assignedSiteIds: ['site-2', 'site-4'],
    createdAt: '2026-03-18T10:00:00Z',
    lastLoginAt: '2026-10-22T11:00:00Z',
  },
];

export const INITIAL_STATE: SystemState = {
  rbacConfig: { ...DEFAULT_RBAC_CONFIG },
  accounts: INITIAL_ACCOUNTS,
  clients: [
    {
      id: 'client-1',
      companyName: 'Apex Sovereign Vaults & Bancorp',
      contactPerson: 'Victoria Sterling',
      contactInfo: 'v.sterling@apexvaults.co.uk · +44 20 7946 0108',
      contractTier: 'Tier-1 Sovereign SLA (24/7 Armed & CIT)',
      activeSince: '2023-04-01',
    },
    {
      id: 'client-2',
      companyName: 'NorthStar Industrial & Refinery Group',
      contactPerson: 'Henrik Larsen',
      contactInfo: 'h.larsen@northstar-ind.com · +44 20 7946 0109',
      contractTier: 'Industrial Critical Infrastructure SLA',
      activeSince: '2024-01-15',
    },
    {
      id: 'client-3',
      companyName: 'Meridian Expositions & Royal Arena',
      contactPerson: 'Claire Beaumont',
      contactInfo: 'c.beaumont@meridianarena.co.uk · +44 20 7946 0188',
      contractTier: 'Major Venue & Event Security SLA',
      activeSince: '2024-09-01',
    },
  ],
  sites: [
    {
      id: 'site-1',
      clientId: 'client-1',
      siteName: 'Apex Central Bullion & Clearing Hub',
      address: '14 Threadneedle Way, Financial District, London EC2R 8AH',
      serviceType: ServiceLine.MANNED_GUARDING,
      supervisorId: 'usr-sup-1',
      assignedGuardIds: ['usr-grd-1'],
      riskLevel: 'Critical',
      riskNotes: 'Dual biometric airlock; mandatory 30-minute perimeter patrol verification and vault seismic telemetry monitoring.',
      cctvStatus: 'Online',
      activeCameras: 64,
      requiredGuards: 6,
    },
    {
      id: 'site-2',
      clientId: 'client-2',
      siteName: 'NorthStar Terminal 4 Petrochemical Refinery',
      address: 'Estuary Dock Road, Thames Haven Industrial Zone, RM16 4PR',
      serviceType: ServiceLine.INDUSTRIAL_SECURITY,
      supervisorId: 'usr-sup-1',
      assignedGuardIds: ['usr-grd-2'],
      riskLevel: 'High',
      riskNotes: 'ATEX hazardous zone clearance required; HazMat gate vehicle undercarriage inspection and thermal perimeter radar.',
      cctvStatus: 'Online',
      activeCameras: 48,
      requiredGuards: 8,
    },
    {
      id: 'site-3',
      clientId: 'client-1',
      siteName: 'Metro Cash-in-Transit Armored Depot',
      address: '88 Vauxhall Secure Logistics Park, London SW8 5EL',
      serviceType: ServiceLine.CASH_IN_TRANSIT,
      supervisorId: 'usr-sup-1',
      assignedGuardIds: ['usr-grd-1'],
      riskLevel: 'Critical',
      riskNotes: 'Armored bay interlocking doors must remain sealed during currency cassette loading.',
      cctvStatus: 'Online',
      activeCameras: 36,
      requiredGuards: 4,
    },
    {
      id: 'site-4',
      clientId: 'client-2',
      siteName: 'Heathrow Diplomatic & High-Value Cargo Corridor',
      address: 'Cargo Apron Gate 12, Southern Perimeter Road, TW6 3JF',
      serviceType: ServiceLine.VALUABLE_TRANSPORT,
      supervisorId: 'usr-sup-1',
      assignedGuardIds: ['usr-grd-2'],
      riskLevel: 'Critical',
      riskNotes: 'Airside escort clearance required; GPS transponder lock active on all valuable transport containers.',
      cctvStatus: 'Online',
      activeCameras: 28,
      requiredGuards: 4,
    },
    {
      id: 'site-5',
      clientId: 'client-1',
      siteName: 'Canary Wharf Optical Command & CCTV Matrix',
      address: '25 Cabot Square, Canary Wharf, London E14 4QZ',
      serviceType: ServiceLine.CCTV_SURVEILLANCE,
      supervisorId: 'usr-sup-1',
      assignedGuardIds: ['usr-grd-1'],
      riskLevel: 'Elevated',
      riskNotes: 'Redundant fiber uplink to SOC; NVR cluster B scheduled for quarterly firmware verification.',
      cctvStatus: 'Maintenance Required',
      activeCameras: 112,
      requiredGuards: 2,
    },
    {
      id: 'site-6',
      clientId: 'client-3',
      siteName: 'Meridian Grand Arena & Summit Center',
      address: '1 Peninsula Square, Greenwich, London SE10 0DX',
      serviceType: ServiceLine.EVENT_SECURITY,
      supervisorId: 'usr-sup-1',
      assignedGuardIds: ['usr-grd-2'],
      riskLevel: 'Elevated',
      riskNotes: 'VIP executive summit ingress screening; magnetometers deployed at Gates A–F.',
      cctvStatus: 'Online',
      activeCameras: 84,
      requiredGuards: 14,
    },
    {
      id: 'site-7',
      clientId: 'client-1',
      siteName: 'Farringdon Subterranean Asset Depository',
      address: '42 Clerkenwell Vaults, Farringdon, London EC1M 5PS',
      serviceType: ServiceLine.ASSET_STORAGE,
      supervisorId: 'usr-sup-1',
      assignedGuardIds: ['usr-grd-1'],
      riskLevel: 'Critical',
      riskNotes: 'Climate-controlled bonded storage for fine art, bearer bonds, and sovereign bullion reserves.',
      cctvStatus: 'Online',
      activeCameras: 52,
      requiredGuards: 4,
    },
  ],
  employees: [
    {
      id: 'emp-1',
      userId: 'usr-grd-1',
      fullName: 'Liam Mercer',
      badgeNumber: 'AV-GRD-1042',
      role: Role.GUARD,
      assignedSiteId: 'site-1',
      startDate: '2024-03-01',
      contractExpiry: '2027-03-01',
      siaLicenseExpiry: '2026-11-12', // Expiring soon alert!
      certifications: ['SIA Door Supervision', 'CIT Tactical Escort', 'First Aid Trauma L3'],
      clearanceLevel: 'Level 3 Sovereign Vault',
      hourlyRate: 24.5,
    },
    {
      id: 'emp-2',
      userId: 'usr-grd-2',
      fullName: 'Sofia Diaz',
      badgeNumber: 'AV-GRD-1089',
      role: Role.GUARD,
      assignedSiteId: 'site-2',
      startDate: '2024-06-15',
      contractExpiry: '2026-11-05', // Expiring soon alert!
      siaLicenseExpiry: '2027-08-20',
      certifications: ['SIA Manned Guarding', 'ATEX Industrial HazMat Safety', 'Crowd Control L2'],
      clearanceLevel: 'Level 2 Industrial Critical',
      hourlyRate: 23.0,
    },
    {
      id: 'emp-3',
      userId: 'usr-sup-1',
      fullName: 'David Keller',
      badgeNumber: 'AV-SUP-0214',
      role: Role.SUPERVISOR,
      assignedSiteId: 'site-1',
      startDate: '2022-09-01',
      contractExpiry: '2028-09-01',
      siaLicenseExpiry: '2028-04-15',
      certifications: ['SIA Close Protection', 'Incident Command & Escalation', 'CIT Crew Commander'],
      clearanceLevel: 'Level 4 Tactical Command',
      hourlyRate: 34.0,
    },
    {
      id: 'emp-4',
      userId: 'usr-tech-1',
      fullName: 'Vikram Patel',
      badgeNumber: 'AV-TEC-0408',
      role: Role.CCTV_TECHNICIAN,
      assignedSiteId: 'site-5',
      startDate: '2023-11-10',
      contractExpiry: '2027-11-10',
      siaLicenseExpiry: '2026-11-18', // Expiring soon alert!
      certifications: ['SIA Public Space Surveillance (CCTV)', 'Axis Network Video Engineer', 'Fiber Optic Splice Cert'],
      clearanceLevel: 'Level 3 Technical Telemetry',
      hourlyRate: 31.0,
    },
  ],
  leaveRequests: [
    {
      id: 'lv-1',
      employeeId: 'emp-1',
      employeeName: 'Liam Mercer',
      leaveType: 'Training / Recertification',
      startDate: '2026-11-04',
      endDate: '2026-11-06',
      reason: 'SIA License renewal classroom module & tactical firearms recertification.',
      status: 'Pending',
    },
    {
      id: 'lv-2',
      employeeId: 'emp-2',
      employeeName: 'Sofia Diaz',
      leaveType: 'Annual Leave',
      startDate: '2026-12-10',
      endDate: '2026-12-16',
      reason: 'Scheduled winter family travel (coverage arranged with Sector B relief team).',
      status: 'Pending',
    },
    {
      id: 'lv-3',
      employeeId: 'emp-4',
      employeeName: 'Vikram Patel',
      leaveType: 'Medical Leave',
      startDate: '2026-10-12',
      endDate: '2026-10-13',
      reason: 'Outpatient dental procedure.',
      status: 'Approved',
    },
  ],
  disciplinaryRecords: [
    {
      id: 'disc-1',
      employeeId: 'emp-1',
      employeeName: 'Liam Mercer',
      date: '2026-09-19',
      category: 'Commendation / Audit Note',
      description: 'Identified and halted unauthorized contractor tailgating at Apex Bullion Hub loading bay.',
      actionTaken: 'Formal Director Commendation added to personnel dossier.',
    },
    {
      id: 'disc-2',
      employeeId: 'emp-2',
      employeeName: 'Sofia Diaz',
      date: '2026-10-03',
      category: 'Late Clock-In',
      description: 'Clocked in 14 minutes past 06:00 roster start at NorthStar Refinery due to A13 road closure.',
      actionTaken: 'Verbal reminder logged; backup route briefing completed.',
    },
  ],
  shifts: [
    {
      id: 'sh-101',
      siteId: 'site-1',
      guardId: 'usr-grd-1',
      guardName: 'Liam Mercer',
      startTime: '2026-10-25T06:00:00Z',
      endTime: '2026-10-25T14:00:00Z',
      postAssignment: 'Vault Airlock & North Perimeter Gate',
      status: 'Active / On-Post',
      clockIn: '2026-10-25T05:56:12Z',
      geoTag: '51.5142° N, 0.0886° W (Verified On-Site · 8m tolerance)',
      hoursLogged: 8,
    },
    {
      id: 'sh-102',
      siteId: 'site-2',
      guardId: 'usr-grd-2',
      guardName: 'Sofia Diaz',
      startTime: '2026-10-25T06:00:00Z',
      endTime: '2026-10-25T14:00:00Z',
      postAssignment: 'Refinery Gatehouse 4 & HazMat Vehicle Checkpoint',
      status: 'Active / On-Post',
      clockIn: '2026-10-25T05:58:40Z',
      geoTag: '51.5094° N, 0.4912° E (Verified On-Site · 11m tolerance)',
      hoursLogged: 8,
    },
    {
      id: 'sh-103',
      siteId: 'site-3',
      guardId: 'usr-grd-1',
      guardName: 'Liam Mercer',
      startTime: '2026-10-26T07:00:00Z',
      endTime: '2026-10-26T15:00:00Z',
      postAssignment: 'CIT Armored Bay Dispatch Escort',
      status: 'Scheduled',
      hoursLogged: 8,
    },
    {
      id: 'sh-104',
      siteId: 'site-6',
      guardId: 'usr-grd-2',
      guardName: 'Sofia Diaz',
      startTime: '2026-10-26T14:00:00Z',
      endTime: '2026-10-26T22:00:00Z',
      postAssignment: 'VIP Executive Concourse Screening',
      status: 'Pending Approval',
      hoursLogged: 8,
    },
    {
      id: 'sh-105',
      siteId: 'site-7',
      guardId: 'usr-grd-1',
      guardName: 'Liam Mercer',
      startTime: '2026-10-24T06:00:00Z',
      endTime: '2026-10-24T14:00:00Z',
      postAssignment: 'Subterranean Depository Vault Corridor',
      status: 'Completed',
      clockIn: '2026-10-24T05:57:00Z',
      clockOut: '2026-10-24T14:03:00Z',
      geoTag: '51.5229° N, 0.1048° W (Verified On-Site)',
      hoursLogged: 8,
    },
  ],
  incidents: [
    {
      id: 'inc-201',
      siteId: 'site-1',
      reportedBy: 'usr-grd-1',
      reporterName: 'Liam Mercer',
      type: 'Unauthorized Access',
      severity: 'High',
      description: 'Unscheduled courier vehicle attempted entry at Loading Bay B using an expired magnetic pass. Vehicle detained at outer bollard barrier; credentials confiscated and logged.',
      attachments: ['bay_b_anpr_capture_0914.jpg', 'confiscated_badge_log.pdf'],
      status: 'Escalated to Command',
      escalatedTo: 'Operation Manager / Director',
      clientVisible: true,
      occurredAt: '2026-10-25T09:14:00Z',
    },
    {
      id: 'inc-202',
      siteId: 'site-5',
      reportedBy: 'usr-tech-1',
      reporterName: 'Vikram Patel',
      type: 'CCTV Feed Interruption',
      severity: 'Medium',
      description: 'PoE switch port 14–18 packet loss detected on Canary Wharf East Concourse NVR-02. Redundant failover stream activated; switch replacement scheduled today.',
      attachments: ['nvr02_diagnostics_report.txt'],
      status: 'Under Supervisor Review',
      escalatedTo: 'Supervisor (David Keller)',
      clientVisible: true,
      occurredAt: '2026-10-25T10:40:00Z',
    },
    {
      id: 'inc-203',
      siteId: 'site-2',
      reportedBy: 'usr-grd-2',
      reporterName: 'Sofia Diaz',
      type: 'Perimeter Breach Attempt',
      severity: 'Critical',
      description: 'Thermal fence sensor triggered along Sector 7 Eastern Estuary Pipe Rack at 03:20. Rapid response unit deployed with K9; acoustic deterrent activated and police patrol notified.',
      attachments: ['sector7_thermal_clip.mp4', 'k9_patrol_sweep_log.pdf'],
      status: 'Open',
      escalatedTo: 'Supervisor (David Keller)',
      clientVisible: true,
      occurredAt: '2026-10-25T03:22:00Z',
    },
  ],
  citJobs: [
    {
      id: 'cit-301',
      jobCode: 'CIT-LON-8841',
      clientId: 'client-1',
      serviceLine: ServiceLine.CASH_IN_TRANSIT,
      pickup: 'Apex Central Bullion & Clearing Hub (EC2R)',
      dropoff: 'Bank of England Regional Clearing Vault (EC2R)',
      crewIds: ['usr-grd-1', 'usr-sup-1'],
      crewNames: ['Liam Mercer (Custodian)', 'David Keller (Commander)'],
      vehicle: 'AV-ARMOR-04 (B6 Ballistic Mercedes Sprinter)',
      valueCategory: 'Tier-1 High Value ($5M+)',
      status: 'In Transit',
      scheduledAt: '2026-10-25T11:30:00Z',
      chainOfCustody: [
        {
          timestamp: '2026-10-25T11:15:00Z',
          checkpoint: 'Vault Bay Dispatch Seal Verification',
          custodian: 'Liam Mercer',
          sealCode: 'SL-994820-A',
          verified: true,
        },
        {
          timestamp: '2026-10-25T11:32:00Z',
          checkpoint: 'Armored Interlock Departure & GPS Telemetry Lock',
          custodian: 'David Keller',
          sealCode: 'SL-994820-A',
          verified: true,
        },
      ],
    },
    {
      id: 'cit-302',
      jobCode: 'VAL-LHR-8842',
      clientId: 'client-2',
      serviceLine: ServiceLine.VALUABLE_TRANSPORT,
      pickup: 'Heathrow Diplomatic Cargo Corridor Gate 12 (TW6)',
      dropoff: 'Farringdon Subterranean Asset Depository (EC1M)',
      crewIds: ['usr-grd-2'],
      crewNames: ['Sofia Diaz (Escort Specialist)'],
      vehicle: 'AV-ARMOR-09 (B7 Heavy Tactical Convoy)',
      valueCategory: 'Tier-1 High Value ($5M+)',
      status: 'Scheduled',
      scheduledAt: '2026-10-25T15:00:00Z',
      chainOfCustody: [
        {
          timestamp: '2026-10-25T08:00:00Z',
          checkpoint: 'Pre-Manifest Customs & Bonded Seal Registration',
          custodian: 'Sofia Diaz',
          sealCode: 'SL-773104-V',
          verified: true,
        },
      ],
    },
    {
      id: 'cit-303',
      jobCode: 'CIT-LON-8839',
      clientId: 'client-1',
      serviceLine: ServiceLine.CASH_IN_TRANSIT,
      pickup: 'Metro CIT Armored Depot (SW8)',
      dropoff: 'Canary Wharf Retail Treasury Branch (E14)',
      crewIds: ['usr-grd-1'],
      crewNames: ['Liam Mercer (Custodian)'],
      vehicle: 'AV-ARMOR-02 (B6 Ballistic Transit)',
      valueCategory: 'Tier-2 Commercial ($1M–$5M)',
      status: 'Completed',
      scheduledAt: '2026-10-24T09:00:00Z',
      chainOfCustody: [
        {
          timestamp: '2026-10-24T08:50:00Z',
          checkpoint: 'Cassette Loadout & Dual Key Sign-Off',
          custodian: 'Liam Mercer',
          sealCode: 'SL-661902-C',
          verified: true,
        },
        {
          timestamp: '2026-10-24T10:18:00Z',
          checkpoint: 'Branch Treasury Receiving Vault Handover',
          custodian: 'Victoria Sterling (Client Signatory)',
          sealCode: 'SL-661902-C',
          verified: true,
        },
      ],
    },
  ],
  cctvJobs: [
    {
      id: 'cctv-401',
      jobCode: 'SURV-CW-501',
      siteId: 'site-5',
      technicianId: 'usr-tech-1',
      technicianName: 'Vikram Patel',
      jobType: 'Emergency Repair',
      status: 'In Progress',
      equipmentUsed: ['Managed 24-Port PoE+ Industrial Switch', '2x Axis Q6225-LE PTZ Cameras', 'Cat6A Shielded Patch Uplinks'],
      technicalNotes: 'Replacing degraded PoE switch on East Concourse rack 3; recalibrating PTZ preset tour 04.',
      scheduledDate: '2026-10-25',
    },
    {
      id: 'cctv-402',
      jobCode: 'SURV-APX-502',
      siteId: 'site-1',
      technicianId: 'usr-tech-1',
      technicianName: 'Vikram Patel',
      jobType: 'Firmware & NVR Audit',
      status: 'Assigned',
      equipmentUsed: ['RAID-6 Enterprise Storage Array (32TB)', 'Encrypted NVR Firmware v11.4'],
      technicalNotes: '90-day sovereign compliance video retention verification and encrypted watermark check.',
      scheduledDate: '2026-10-26',
    },
    {
      id: 'cctv-403',
      jobCode: 'SURV-NS-498',
      siteId: 'site-2',
      technicianId: 'usr-tech-1',
      technicianName: 'Vikram Patel',
      jobType: 'New Installation',
      status: 'Completed',
      equipmentUsed: ['4x Explosion-Proof ATEX Thermal Cameras', 'Armored Fiber Conduit (120m)'],
      technicalNotes: 'Installed along Sector 7 pipe rack; integrated into SOC live alarm matrix.',
      scheduledDate: '2026-10-21',
      signedOffBy: 'David Keller (Supervisor)',
    },
  ],
  invoices: [
    {
      id: 'inv-501',
      invoiceNumber: 'INV-2026-1041',
      clientId: 'client-1',
      serviceLine: ServiceLine.MANNED_GUARDING,
      amount: 48500,
      status: 'Issued',
      issuedDate: '2026-10-01',
      dueDate: '2026-10-31',
      billingPeriod: 'October 2026 Retainer (Apex Bullion Hub 24/7 Guarding)',
    },
    {
      id: 'inv-502',
      invoiceNumber: 'INV-2026-1042',
      clientId: 'client-1',
      serviceLine: ServiceLine.CASH_IN_TRANSIT,
      amount: 32400,
      status: 'Paid',
      issuedDate: '2026-09-15',
      dueDate: '2026-10-15',
      billingPeriod: 'September 2026 Armored CIT & Bullion Transfers',
    },
    {
      id: 'inv-503',
      invoiceNumber: 'INV-2026-1043',
      clientId: 'client-2',
      serviceLine: ServiceLine.INDUSTRIAL_SECURITY,
      amount: 64200,
      status: 'Issued',
      issuedDate: '2026-10-05',
      dueDate: '2026-11-05',
      billingPeriod: 'October 2026 Refinery Perimeter & HazMat Security',
    },
    {
      id: 'inv-504',
      invoiceNumber: 'INV-2026-1044',
      clientId: 'client-3',
      serviceLine: ServiceLine.EVENT_SECURITY,
      amount: 29800,
      status: 'Overdue',
      issuedDate: '2026-09-10',
      dueDate: '2026-10-10',
      billingPeriod: 'Global FinTech Summit Crowd & VIP Protection',
    },
    {
      id: 'inv-505',
      invoiceNumber: 'INV-2026-1045',
      clientId: 'client-1',
      serviceLine: ServiceLine.ASSET_STORAGE,
      amount: 19500,
      status: 'Paid',
      issuedDate: '2026-10-01',
      dueDate: '2026-10-20',
      billingPeriod: 'Q4 Subterranean Vault Bonded Asset Custody',
    },
  ],
  expenses: [
    {
      id: 'exp-601',
      category: 'Armored Fleet Fuel & Maintenance',
      serviceLine: ServiceLine.CASH_IN_TRANSIT,
      description: 'B6 Armored Sprinter fleet ballistic glass seal inspection & run-flat tire servicing',
      amount: 8450,
      date: '2026-10-18',
    },
    {
      id: 'exp-602',
      category: 'CCTV Hardware & NVRs',
      serviceLine: ServiceLine.CCTV_SURVEILLANCE,
      description: 'Axis PTZ camera replacements & 24-Port Managed PoE+ switches for Canary Wharf',
      amount: 6200,
      date: '2026-10-22',
    },
    {
      id: 'exp-603',
      category: 'Tactical Uniforms & Radios',
      serviceLine: ServiceLine.MANNED_GUARDING,
      description: 'Encrypted TETRA digital handsets & stab-resistant tactical vests (12 units)',
      amount: 5180,
      date: '2026-10-14',
    },
  ],
  auditLogs: [
    {
      id: 'aud-901',
      actorId: 'usr-dir-1',
      actorUsername: 'director.vance',
      actorRole: Role.DIRECTOR,
      action: 'ACCOUNT_CREATED',
      targetId: 'usr-ops-1',
      targetUsername: 'ops.hale',
      details: 'Provisioned Operation Manager account for Elena Hale with full operational command privileges.',
      timestamp: '2026-01-12T08:30:00Z',
    },
    {
      id: 'aud-902',
      actorId: 'usr-ops-1',
      actorUsername: 'ops.hale',
      actorRole: Role.OPERATION_MANAGER,
      action: 'ACCOUNT_CREATED',
      targetId: 'usr-grd-1',
      targetUsername: 'guard.mercer',
      details: 'Provisioned Guard account for Liam Mercer (Badge AV-GRD-1042) assigned to Apex Central Bullion Hub.',
      timestamp: '2026-03-01T07:00:00Z',
    },
    {
      id: 'aud-903',
      actorId: 'usr-dir-1',
      actorUsername: 'director.vance',
      actorRole: Role.DIRECTOR,
      action: 'ACCOUNT_CREATED',
      targetId: 'usr-cli-1',
      targetUsername: 'client.apex',
      details: 'Provisioned external Client Portal account for Victoria Sterling (Apex Sovereign Vaults).',
      timestamp: '2026-03-15T10:00:00Z',
    },
  ],
};
