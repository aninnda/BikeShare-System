/**
 * Authentication and Authorization Middleware
 * Provides role-based access control for BMS API endpoints
 */

/**
 * Middleware to authenticate user and extract user info from request
 * This is a simplified version - in production you'd use JWT tokens or sessions
 */
const authenticateUser = (req, res, next) => {
    // For demo purposes, we'll expect user info in headers
    // In production, this would validate JWT tokens or session cookies
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];
    const username = req.headers['x-username'];

    if (!userId || !userRole) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please provide user credentials.',
            error: 'AUTHENTICATION_REQUIRED'
        });
    }

    // Validate role is one of the allowed values
    // 'dual' users act as both rider and operator
    const allowedRoles = ['rider', 'operator', 'admin', 'dual'];
    if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Invalid user role',
            error: 'INVALID_ROLE'
        });
    }

    // Attach user info to request object
    req.user = {
        id: userId,
        role: userRole,
        username: username || `user_${userId}`
    };

    next();
};

/**
 * Middleware to check if user has required role
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                error: 'NOT_AUTHENTICATED'
            });
        }

        // Convert single role to array for consistent handling
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        // If a user has role 'dual' treat them as both 'rider' and 'operator'
        const effectiveUserRoles = req.user.role === 'dual' ? ['dual', 'rider', 'operator'] : [req.user.role];

        const hasAccess = roles.some(r => effectiveUserRoles.includes(r));
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
                error: 'INSUFFICIENT_PERMISSIONS',
                requiredRoles: roles,
                userRole: req.user.role
            });
        }

        next();
    };
};

/**
 * Middleware shortcuts for common role checks
 */
const requireRider = requireRole('rider');
const requireOperator = requireRole('operator');
const requireRiderOrOperator = requireRole(['rider', 'operator']);
const requireAdmin = requireRole('admin');

/**
 * Middleware to validate user owns the resource or has operator privileges
 */
const requireOwnershipOrOperator = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            error: 'NOT_AUTHENTICATED'
        });
    }

    // Operators (and dual users) can access any resource
    if (req.user.role === 'operator' || req.user.role === 'dual' || req.user.role === 'admin') {
        return next();
    }

    // For riders, check if they own the resource
    const resourceUserId = req.params.userId || req.body.userId;
    if (req.user.role === 'rider' && req.user.id === resourceUserId) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources or need operator privileges.',
        error: 'INSUFFICIENT_PERMISSIONS'
    });
};

module.exports = {
    authenticateUser,
    requireRole,
    requireRider,
    requireOperator,
    requireRiderOrOperator,
    requireAdmin,
    requireOwnershipOrOperator
};