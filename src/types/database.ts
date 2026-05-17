export type UserRole = 'ADMIN' | 'MANAGER' | 'SELLER';
export type CompanyStatus = 'ACTIVE' | 'INACTIVE' | 'PROSPECT';
export type QuoteType = 'PLAN' | 'TRAINING' | 'BOTH';
export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type PlanType = 'ESSENCIAL' | 'INTEGRAL' | 'AVANCADO';
export type ClientType = 'NONE' | 'ESSENCIAL' | 'INTEGRAL' | 'AVANCADO';
export type ConfigCategory = 'margem' | 'imposto' | 'fixo' | 'unidade' | 'funcionario';

export interface UserDevice {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string | null;
  brand: string | null;
  model_name: string | null;
  os_name: string | null;
  os_version: string | null;
  app_version: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  company_name: string;
  trade_name: string | null;
  cnpj: string;
  cpf: string | null;
  email: string;
  phone: string;
  contact_name: string;
  contact_role: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  sector: string;
  employee_count: number;
  risk_grade: number;
  notes: string | null;
  clickup_task_id: string | null;
  status: CompanyStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  quote_number: string;
  company_id: string;
  type: QuoteType;
  status: QuoteStatus;
  total_value: number;
  monthly_value: number;
  valid_until: string;
  payment_terms: string | null;
  notes: string | null;
  pdf_url: string | null;
  signature_url: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // join
  companies?: { company_name: string; cnpj: string } | null;
}

export interface PlanConfig {
  id: string;
  key: string;
  name: string;
  value: number;
  category: ConfigCategory;
  description: string | null;
  updated_by: string;
  updated_at: string;
}

export interface GheTable {
  id: string;
  risk_grade: number;
  function_range: number;
  hours: number;
  value: number;
  updated_at: string;
}

export interface Training {
  id: string;
  code: string;
  description: string;
  value: number;
  is_combo: boolean;
  combo_items: string[] | null;
  excludes: string[] | null;
  order_index: number;
  is_active: boolean;
  updated_at: string;
}

export interface TrainingDiscount {
  id: string;
  plan_type: ClientType;
  discount_percent: number;
  updated_at: string;
}

export interface CompanyFavorite {
  id: string;
  user_id: string;
  company_id: string;
  created_at: string;
}
