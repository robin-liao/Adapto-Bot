import type { AdaptiveCard } from "adaptivecards";

export interface UniversalSearchRequest {
  queryText: string;
  queryOptions: UniversalSearchQueryOptions;
  dataset?: string;
  context?: UniversalSearchContext;
}

export interface UniversalSearchResult {
  results: UniversalSearchItem[];
  totalResultCount: number;
  moreResultsAvailable?: boolean;
  queryOptions?: UniversalSearchQueryOptions;
  displayLayouts?: UniversalSearchDisplayLayout[];
}

export interface UniversalSearchContext {
  // Source of the search (AdaptiveCard, MessagingExtension, etc.)
  source?: string;
  // Element which triggered the search
  elementId?: string;
  // Command which was triggered on a MessagingExtension
  commandId?: string;
}

export interface UniversalSearchItem {
  value: string;
  title?: string;
  subTitle?: string;
  imageUrl?: string;
  displayLayout?: string;
}

export interface UniversalSearchQueryOptions {
  skip: number;
  top: number;
  continuationToken?: string;
}

export interface UniversalSearchDisplayLayout {
  layoutId: string;
  layoutBody: AdaptiveCard;
}

export type UniversalSearchResponse =
  | UniversalSearchResultWrapper
  | UniversalSearchErrorTypes;

export type UniversalSearchErrorTypes =
  | UniversalSearchError
  | UniversalSearchRateLimit
  | UniversalSearchUnauthorized;

export interface UniversalSearchResultWrapper {
  statusCode?:
    | UniversalSearchStatusCodes.Success
    | UniversalSearchStatusCodes.NoContent;
  type?: "application/vnd.microsoft.search.searchResponse";
  value?: UniversalSearchResult;
}

export interface UniversalSearchError {
  statusCode?:
    | UniversalSearchStatusCodes.InternalServerError
    | UniversalSearchStatusCodes.ServiceUnavailable;
  type?: "application/vnd.microsoft.error";
  value?: {
    code: string;
    message: string;
  };
}

export interface UniversalSearchUnauthorized {
  statusCode?: UniversalSearchStatusCodes.Unauthorized;
  type?: "application/vnd.microsoft.activity.loginRequest";
  value?: {
    loginUrl: string;
  };
}

export interface UniversalSearchRateLimit {
  statusCode?: UniversalSearchStatusCodes.RateLimit;
  type?: "application/vnd.microsoft.activity.retryAfter";
  value?: number;
}

export enum UniversalSearchStatusCodes {
  Success = 200,
  NoContent = 204,
  Unauthorized = 401,
  RateLimit = 429,
  InternalServerError = 500,
  ServiceUnavailable = 504,
}
