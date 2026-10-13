import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthenticatedRequest, IUserPayload, UserRole } from '../types';
import { User } from '../models/User';
import { Shop } from '../models/Shop';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.accessSecret) as IUserPayload;

    // Verify user exists and is active
    const user = await User.findById(decoded.userId).select('name email role isActive assignedShopIds tokenVersion');
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Account not found or has been deactivated.',
      });
      return;
    }

    // Verify token version to revoke stale sessions after password reset/change
    if (decoded.tokenVersion !== undefined && (user.tokenVersion || 0) !== decoded.tokenVersion) {
      res.status(401).json({
        success: false,
        message: 'Session has been invalidated due to a security update or password change. Please log in again.',
        code: 'TOKEN_REVOKED',
      });
      return;
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      assignedShopIds: user.assignedShopIds.map((id) => id.toString()),
      tokenVersion: user.tokenVersion || 0,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Session expired. Please refresh your session or log in again.',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }
    res.status(401).json({
      success: false,
      message: 'Invalid authorization token.',
    });
  }
};

export const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwt.accessSecret) as IUserPayload;
        const user = await User.findById(decoded.userId).select('name email role isActive assignedShopIds');
        if (user && user.isActive) {
          req.user = {
            userId: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            assignedShopIds: user.assignedShopIds.map((id) => id.toString()),
          };
        }
      } catch {
        // Silently continue without user
      }
    }
    next();
  } catch {
    next();
  }
};

export const authorizeRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access forbidden: Insufficient permissions for this resource.',
      });
      return;
    }

    next();
  };
};

/**
 * Tenant scoping middleware: guarantees that a Shop Admin can ONLY access their assigned shop.
 * Super Admin has platform-wide access.
 */
export const requireShopAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    // Super Admin bypasses shop restriction
    if (req.user.role === 'super_admin') {
      next();
      return;
    }

    if (req.user.role !== 'shop_admin') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Shop administrative privilege required.',
      });
      return;
    }

    // Determine target shopId from request params, query, or body
    let targetShopId = req.params.shopId || req.body.shopId || req.query.shopId as string;

    // If shop slug is provided in params, resolve shopId
    if (!targetShopId && req.params.slug) {
      const shop = await Shop.findOne({ slug: req.params.slug.toLowerCase() });
      if (shop) {
        targetShopId = shop._id.toString();
      }
    }

    // If no targetShopId was in url/body, default to the user's primary assigned shop
    if (!targetShopId && req.user.assignedShopIds.length > 0) {
      targetShopId = req.user.assignedShopIds[0];
    }

    if (!targetShopId) {
      res.status(400).json({
        success: false,
        message: 'Shop identifier is required.',
      });
      return;
    }

    // Verify tenant ownership
    const isAssigned = req.user.assignedShopIds.includes(targetShopId);
    if (!isAssigned) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have administrative access to this shop.',
      });
      return;
    }

    req.shopId = targetShopId;
    next();
  } catch (error) {
    next(error);
  }
};
