export type Tier = "Gold" | "Platinum" | "Silver" | "Bronze" | "None";

export interface MembershipPlan {
  plan_id: string;
  plan_name: "Gold" | "Platinum";
  monthly_fee: number;
  yearly_fee: number;
  equipment_discount: number;
  venue_discount: number;
  duration: string;
  benefits: string[];
}

export interface Member {
  member_id: string;
  member_name: string;
  username: string;
  email: string;
  phone: string;
  tier: Tier;
  wallet_balance: number;
  is_delinquent: boolean;
  plan_id: string;
  joined: string;
}

export interface AdminAccount {
  admin_id: string;
  username: string;
  email: string;
  phone: string;
}

export interface Sport {
  sport_id: string;
  sport_name: string;
  category: "Indoor" | "Outdoor";
}

export type VenueStatus = "Available" | "Booked" | "Under Maintenance";

export interface Venue {
  venue_id: string;
  venue_name: string;
  venue_type: string;
  base_hourly_fee: number;
  sport_ids: string[];
  parent_venue_id?: string;
  status: VenueStatus;
}

export type PaymentMethod = "Wallet" | "Card" | "UPI" | "Cash";

export interface Payment {
  payment_id: string;
  booking_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_status: "Paid" | "Pending" | "Failed";
  payment_date: string;
}

export interface VenueBooking {
  booking_id: string;
  venue_id: string;
  member_id: string;
  start_time: string;
  end_time: string;
  total_cost: number;
  payment_id?: string;
}

export type EquipStatus = "Available" | "In Use" | "Under Maintenance";

export interface Equipment {
  asset_id: string;
  name: string;
  category: string;
  total_quantity: number;
  available_quantity: number;
  daily_price: number;
  status: EquipStatus;
}

export interface EquipmentIssue {
  issue_id: string;
  member_id: string;
  asset_id: string;
  issue_date: string;
  due_date: string;
  returned_date?: string;
  late_fee: number;
}

export type RequestStatus = "Pending" | "In Progress" | "Completed";

export interface MaintenanceRequest {
  request_id: string;
  venue_id: string;
  reported_date: string;
  description: string;
  request_status: RequestStatus;
  priority?: "Low" | "Medium" | "High" | "Critical";
  technician_notes?: string;
}
