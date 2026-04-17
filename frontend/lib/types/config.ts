export interface SystemConfigRecord {
  id: number;
  owner_id: number;
  provider: string;
  api_key: string | null;
  api_key_masked?: string | null;
  api_key_configured?: boolean;
  api_url: string | null;
  model: string;
  temperature: number;
  created_at: string;
}

export interface SystemConfigPayload {
  provider?: string;
  api_key?: string | null;
  api_url?: string | null;
  model?: string;
  temperature?: number;
}
