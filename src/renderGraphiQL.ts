
import type { FormattedExecutionResult } from 'graphql';

export interface GraphiQLData {
  query?: string | null;
  variables?: { readonly [name: string]: unknown } | null;
  operationName?: string | null;