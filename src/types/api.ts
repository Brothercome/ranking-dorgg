export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SearchGameRequest {
  gameName: string;
  tagLine: string;
}

export interface OrgSearchRequest {
  query: string;
  level?: "middle" | "high" | "university";
}

export interface RegisterRankRequest {
  gameAccountId: string;
  organizationId: string;
}
