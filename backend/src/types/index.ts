import { Request } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'super_admin' | 'shop_admin' | 'customer';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_for_dispatch'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refunded';

export interface IUserPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  assignedShopIds: string[]; // For shop_admin (may manage one or explicitly assigned shops)
  tokenVersion?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: IUserPayload;
  shopId?: string; // Set by shop-scoping middleware
}

export interface IPaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IPaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
