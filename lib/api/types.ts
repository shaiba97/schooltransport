export interface TransportDashboard {
  vehicles: {
    total: number;
    active: number;
    maintenance: number;
    inactive: number;
  };
  routes: number;
  studentsAssigned: number;
  tripsToday: {
    total: number;
    inProgress: number;
    completed: number;
  };
}

export interface Bus {
  id: string;
  plateNumber: string;
  model: string;
  capacity: number;
  driverName: string;
  driverPhone: string;
  driverLicenseNumber: string;
  driverEmergencyContact: string;
  status: "ACTIVE" | "MAINTENANCE" | "INACTIVE";
  createdAt?: string;
  _count?: { routes: number };
}

export type BusStatus = Bus["status"];
export type TransportShift = "MORNING" | "EVENING" | "BOTH";

export interface BusRouteSummary {
  id: string;
  name: string;
  shift: TransportShift;
  busId: string | null;
  _count: { stops: number; assignments: number };
}

export interface BusDetail extends Bus {
  routes: BusRouteSummary[];
}

export interface BusListResponse {
  data: Bus[];
  total: number;
  page: number;
  limit: number;
}

export interface Stop {
  id: string;
  routeId: string;
  name: string;
  sequence: number;
  morningEta?: string | null;
  eveningEta?: string | null;
}

export interface TransportRoute {
  id: string;
  name: string;
  shift: TransportShift;
  busId: string | null;
  bus?: Bus | null;
  stops?: Stop[];
  _count?: { stops: number; assignments: number; trips: number };
}

export interface TripEvent {
  id: string;
  tripId: string;
  stopId: string | null;
  type: "STARTED" | "ARRIVED_STOP";
  at: string;
  stop?: { id: string; name: string; sequence?: number } | null;
}

export interface TransportTrip {
  id: string;
  routeId: string;
  route?: { id: string; name: string; shift?: string; bus?: { id: string; plateNumber: string; driverName: string } | null };
  tripDate: string;
  startedAt: string;
  completedAt: string | null;
  status: "IN_PROGRESS" | "COMPLETED";
  events?: TripEvent[];
}

export type ManifestFeeStatus = "NOT_BILLED" | "PAID" | "PARTIAL" | "PENDING";

export interface ManifestRow {
  assignmentId: string;
  studentId: string;
  studentName: string;
  roleNumber: string;
  className: string | null;
  routeId: string;
  routeName: string;
  shift: TransportShift;
  stopId: string | null;
  stopName: string | null;
  transportFee: number;
  transportPaid: number;
  feeStatus: ManifestFeeStatus;
}

export interface ManifestResponse {
  data: ManifestRow[];
  total: number;
  page: number;
  limit: number;
}

export interface CandidateAssignment {
  routeId: string;
  routeName: string;
  stopId: string | null;
  stopName: string | null;
}

export interface CandidateStudent {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  roleNumber: string;
  fullName: string;
  assignment: CandidateAssignment | null;
}

export interface CandidateResponse {
  data: CandidateStudent[];
  total: number;
  page: number;
  limit: number;
}
