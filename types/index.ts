export type Project = {
  id: string
  user_id: string
  name: string
  description: string | null
  address: string | null
  budget: number | null
  notes: string | null
  created_at: string
}

export type CostCategory = {
  id: string
  name: string
  color: string
  user_id?: string | null
}

export type Cost = {
  id: string
  project_id: string
  category_id: string | null
  stage_id: string | null
  name: string
  amount: number
  date: string
  vendor: string | null
  notes: string | null
  receipt_url: string | null
  ocr_data: OcrData | null
  created_at: string
  cost_categories?: CostCategory | null
  project_stages?: ProjectStage | null
}

export type OcrData = {
  name?: string
  vendor?: string
  amount?: number
  date?: string
  items_text?: string
  raw?: string
}

export type ShareLink = {
  id: string
  project_id: string
  token: string
  label: string | null
  expires_at: string | null
  created_at: string
}

export type BudowaMember = {
  id: string
  project_id: string
  invited_email: string
  role: string
  created_at: string
}

export type ProjectStage = {
  id: string
  project_id: string
  name: string
  color: string
  sort_order: number
  created_at: string
}

export type CostSnapshot = {
  name: string
  amount: number
  date: string
  vendor: string | null
  notes: string | null
  category_id: string | null
  category_name: string | null
  stage_id: string | null
}

export type CostHistoryEntry = {
  id: string
  cost_id: string
  project_id: string
  changed_by_email: string
  changed_at: string
  old_data: CostSnapshot
  new_data: CostSnapshot
}

export type CostImportRow = {
  name: string
  amount: number
  date: string
  vendor: string | null
  notes: string | null
  category_id: string | null
  stage_id: string | null
  // only set after failed validation
  _error?: string
}
