export type UseCaseTemplateValidationCheck = {
  category: string;
  check: string;
  status: "passed" | "warning" | "failed";
  message: string;
};

export type UseCaseTemplateValidationReport = {
  package_id?: string;
  slug?: string;
  version?: string;
  status: "passed" | "warning" | "failed";
  summary: {
    passed: number;
    warnings: number;
    failed: number;
  };
  checks: UseCaseTemplateValidationCheck[];
  blocking_errors: string[];
  warnings: string[];
};

export type UseCaseTemplateCompileReport = {
  status: string;
  summary?: {
    passed: number;
    warnings: number;
    failed: number;
  };
  checks?: Array<{
    category: string;
    check: string;
    status: string;
    message: string;
  }>;
  blocking_errors?: string[];
  warnings?: string[];
};

export type UseCaseTemplateMaterializationReport = {
  status?: string;
  plan?: Record<string, unknown>;
  registry?: Record<string, unknown>;
  blocking_errors?: string[];
  warnings?: string[];
  checked_at?: string;
};

export type UseCaseTemplateLiveVerificationReport = {
  status?: string;
  checks?: Record<string, boolean>;
  checked_at?: string;
};

export type UseCaseTemplatePreview = {
  package_id?: string;
  slug?: string;
  version?: string;
  name?: string;
  domain?: string;
  owner?: string;
  route_to_be_added?: string | null;
  api_prefix?: string | null;
  business_summary?: {
    problem?: string;
    personas?: string[];
    kpis?: string[];
    decisions?: string[];
  };
  dbt_models?: string[];
  backend_assets?: string[];
  portal_assets?: string[];
  dashboard_assets?: string[];
  governance_assets?: string[];
  demo_entities?: Array<{ id?: string; type?: string; output_seed?: string }>;
  synthetic_seed_files?: string[];
  lifecycle_capabilities?: string[];
  conflicts?: string[];
  warnings?: string[];
  install_impact?: {
    materialization_mode?: string;
    full_runtime_supported?: boolean;
    notes?: string[];
  };
};

export type UseCaseRuntimeCatalogEntry = {
  name?: string;
  slug?: string;
  domain?: string;
  description?: string;
  workspace_route?: string | null;
  default_tab_route?: string | null;
  tabs?: Array<{
    id?: string;
    label?: string;
    route?: string;
    widget_count?: number;
  }>;
  widget_count?: number;
  personas?: string[];
  kpis?: string[];
  materialization_status?: string;
  activation_status?: string;
  live_verification_status?: string;
  product_promotion_status?: string;
};

export type UseCaseTemplateAction = {
  event_id: string;
  actor: string;
  action: string;
  package_id: string;
  slug: string;
  version: string;
  status: string;
  timestamp: string;
  validation_result?: string | null;
  error_message?: string | null;
  log?: string;
};

export type UseCaseTemplatePackage = {
  id?: string;
  package_id: string;
  slug: string;
  name: string;
  version: string;
  domain?: string;
  owner?: string;
  uploaded_by?: string;
  uploaded_at?: string;
  status:
    | "uploaded"
    | "staged"
    | "validation_failed"
    | "validated"
    | "installed"
    | "applied"
    | "included"
    | "excluded"
    | "operationally_removed"
    | "uninstalled"
    | "failed";
  enabled?: boolean;
  package_validation_status?: string;
  compile_status?: string;
  materialization_status?: string;
  activation_status?: string;
  live_verification_status?: string;
  product_promotion_status?: string;
  validation_summary?: UseCaseTemplateValidationReport;
  compile_report?: UseCaseTemplateCompileReport;
  materialization_report?: UseCaseTemplateMaterializationReport;
  live_verification_report?: UseCaseTemplateLiveVerificationReport;
  preview_summary?: UseCaseTemplatePreview;
  runtime_catalog_entry?: UseCaseRuntimeCatalogEntry;
  last_action?: string;
  last_action_at?: string;
  error_message?: string;
  last_error?: string;
  actions?: UseCaseTemplateAction[];
};
