export interface Milestone {
  id: string;
  amount: number; // XLM
  description: string;
  reached: boolean;
}

export interface MilestoneInput {
  amount: string;
  description: string;
}
