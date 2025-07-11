import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { JWTUtils } from '../utils/jwt';
import { PasswordUtils } from '../utils/password';
import emailService from '../services/emailService';
import {
	generatePasswordResetToken,
	generatePasswordResetExpiration,
	hashPasswordResetToken,
	verifyPasswordResetToken,
	isPasswordResetTokenExpired,
} from '../utils/passwordReset';
import {
	generateEmailVerificationToken,
	generateEmailVerificationExpiration,
	hashEmailVerificationToken,
	verifyEmailVerificationToken,
	isEmailVerificationTokenExpired,
} from '../utils/emailVerification';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

export const register = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { email, password, firstName, lastName } =
			req.body;

		// Check if user already exists - select only email for faster query
		const existingUser = await prisma.user.findUnique({
			where: { email },
			select: { email: true },
		});

		if (existingUser) {
			res.status(400).json({
				success: false,
				message:
					'User already exists with this email',
			});
			return;
		}

		// Hash password
		const hashedPassword =
			await PasswordUtils.hashPassword(password);

		// DISABLED: Generate email verification token (will re-enable later)
		// const verificationToken =
		// 	generateEmailVerificationToken();
		// const hashedVerificationToken =
		// 	await hashEmailVerificationToken(
		// 		verificationToken
		// 	);
		// const verificationExpires =
		// 	generateEmailVerificationExpiration();

		// Create user with email verification DISABLED (auto-verified)
		const user = await prisma.user.create({
			data: {
				email,
				password: hashedPassword,
				firstName,
				lastName,
				isVerified: true, // Auto-verify users for now
				// DISABLED: Email verification fields
				// emailVerificationToken: hashedVerificationToken,
				// emailVerificationExpires: verificationExpires,
			},
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				isVerified: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		// DISABLED: Send email verification email (will re-enable later)
		// setImmediate(() => {
		// 	emailService
		// 		.sendEmailVerification(
		// 			email,
		// 			firstName,
		// 			verificationToken
		// 		)
		// 		.catch((error) =>
		// 			console.error(
		// 				'Email verification failed:',
		// 				error
		// 			)
		// 		);
		// });

		// Generate JWT tokens immediately (auto-login)
		const accessToken = JWTUtils.generateAccessToken({
			userId: user.id,
			email: user.email,
		});

		const refreshToken = JWTUtils.generateRefreshToken({
			userId: user.id,
			email: user.email,
		});

		res.status(201).json({
			success: true,
			message:
				'Registration successful! You are now logged in.',
			data: {
				user,
				accessToken,
				refreshToken,
				requiresVerification: false, // No verification needed
			},
		});
	} catch (error) {
		console.error('Registration error:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

export const login = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { email, password } = req.body;

		// Find user by email with selective fields for faster query
		const user = await prisma.user.findUnique({
			where: { email },
			select: {
				id: true,
				email: true,
				password: true,
				firstName: true,
				lastName: true,
				isVerified: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!user) {
			res.status(401).json({
				success: false,
				message: 'Invalid email or password',
			});
			return;
		}

		// Check if user has a password
		if (!user.password) {
			res.status(401).json({
				success: false,
				message: 'Invalid email or password',
			});
			return;
		}

		// Validate password
		const isValidPassword =
			await PasswordUtils.comparePassword(
				password,
				user.password
			);
		if (!isValidPassword) {
			res.status(401).json({
				success: false,
				message: 'Invalid email or password',
			});
			return;
		}

		// DISABLED: Check if user is verified (will re-enable later)
		// if (!user.isVerified) {
		// 	res.status(403).json({
		// 		success: false,
		// 		message:
		// 			'Please verify your email before logging in',
		// 		error: 'Email not verified',
		// 		data: {
		// 			email: user.email,
		// 			requiresVerification: true,
		// 		},
		// 	});
		// 	return;
		// }

		// Generate JWT tokens
		const accessToken = JWTUtils.generateAccessToken({
			userId: user.id,
			email: user.email,
		});

		const refreshToken = JWTUtils.generateRefreshToken({
			userId: user.id,
			email: user.email,
		});

		// Remove password from response
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password: _, ...userWithoutPassword } =
			user;

		res.json({
			success: true,
			message: 'Login successful',
			data: {
				user: userWithoutPassword,
				accessToken,
				refreshToken,
			},
		});
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

export const logout = async (
	req: AuthenticatedRequest,
	res: Response
): Promise<void> => {
	try {
		// With stateless JWT, logout is handled client-side
		// We just return success immediately
		// Client should remove tokens from storage

		res.json({
			success: true,
			message: 'Logout successful',
		});
	} catch (error) {
		console.error('Logout error:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

export const refreshToken = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { refreshToken } = req.body;

		if (!refreshToken) {
			res.status(401).json({
				success: false,
				message: 'Refresh token is required',
			});
			return;
		}

		// Verify refresh token
		const decoded =
			JWTUtils.verifyRefreshToken(refreshToken);

		// Generate new access token
		const newAccessToken = JWTUtils.generateAccessToken(
			{
				userId: decoded.userId,
				email: decoded.email,
			}
		);

		// Optionally generate new refresh token for rotation
		const newRefreshToken =
			JWTUtils.generateRefreshToken({
				userId: decoded.userId,
				email: decoded.email,
			});

		res.json({
			success: true,
			message: 'Token refreshed successfully',
			data: {
				accessToken: newAccessToken,
				refreshToken: newRefreshToken,
			},
		});
	} catch (error) {
		console.error('Token refresh error:', error);
		res.status(401).json({
			success: false,
			message: 'Invalid refresh token',
		});
	}
};

export const getProfile = async (
	req: AuthenticatedRequest,
	res: Response
): Promise<void> => {
	try {
		const userId = req.user?.userId;

		if (!userId) {
			res.status(401).json({
				success: false,
				message: 'User not authenticated',
			});
			return;
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				isVerified: true,
				avatar: true,
				preferences: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!user) {
			res.status(404).json({
				success: false,
				message: 'User not found',
			});
			return;
		}

		res.json({
			success: true,
			data: { user },
		});
	} catch (error) {
		console.error('Get profile error:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

export const updateProfile = async (
	req: AuthenticatedRequest,
	res: Response
): Promise<void> => {
	try {
		const userId = req.user?.userId;
		const { firstName, lastName, avatar, preferences } =
			req.body;

		if (!userId) {
			res.status(401).json({
				success: false,
				message: 'User not authenticated',
			});
			return;
		}

		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: {
				firstName,
				lastName,
				avatar,
				preferences,
				updatedAt: new Date(),
			},
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				isVerified: true,
				avatar: true,
				preferences: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		res.json({
			success: true,
			message: 'Profile updated successfully',
			data: { user: updatedUser },
		});
	} catch (error) {
		console.error('Update profile error:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

export const changePassword = async (
	req: AuthenticatedRequest,
	res: Response
): Promise<void> => {
	try {
		const userId = req.user?.userId;
		const { currentPassword, newPassword } = req.body;

		if (!userId) {
			res.status(401).json({
				success: false,
				message: 'User not authenticated',
			});
			return;
		}

		// Get user with password
		const user = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			res.status(404).json({
				success: false,
				message: 'User not found',
			});
			return;
		}

		// Check if user has a password
		if (!user.password) {
			res.status(400).json({
				success: false,
				message:
					'Cannot change password for this account',
			});
			return;
		}

		// Validate current password
		const isValidPassword =
			await PasswordUtils.comparePassword(
				currentPassword,
				user.password
			);
		if (!isValidPassword) {
			res.status(400).json({
				success: false,
				message: 'Current password is incorrect',
			});
			return;
		}

		// Hash new password
		const hashedNewPassword =
			await PasswordUtils.hashPassword(newPassword);

		// Update password
		await prisma.user.update({
			where: { id: userId },
			data: {
				password: hashedNewPassword,
				updatedAt: new Date(),
			},
		});

		// Send password change confirmation email (async)
		emailService
			.sendPasswordChangeConfirmation(
				user.email,
				user.firstName
			)
			.catch((error) =>
				console.error(
					'Password change confirmation email failed:',
					error
				)
			);

		// Invalidate all sessions for security
		await prisma.session.deleteMany({
			where: { userId },
		});

		res.json({
			success: true,
			message:
				'Password changed successfully. Please login again.',
		});
	} catch (error) {
		console.error('Change password error:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

/**
 * Delete user account - permanently removes user and all associated data
 */
export const deleteAccount = async (
	req: AuthenticatedRequest,
	res: Response
): Promise<void> => {
	try {
		const userId = req.user?.userId;

		if (!userId) {
			res.status(401).json({
				success: false,
				message: 'User not authenticated',
			});
			return;
		}

		// Get user info before deletion for email
		const user = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			res.status(404).json({
				success: false,
				message: 'User not found',
			});
			return;
		}

		// Delete all user sessions first
		await prisma.session.deleteMany({
			where: { userId },
		});

		// Delete the user account
		await prisma.user.delete({
			where: { id: userId },
		});

		res.json({
			success: true,
			message: 'Account deleted successfully',
		});
	} catch (error) {
		console.error('Delete account error:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

/**
 * Request password reset - send email with reset link
 */
export const requestPasswordReset = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { email } = req.body;

		// Find user by email
		const user = await prisma.user.findUnique({
			where: { email },
		});

		// Always return success to prevent email enumeration
		if (!user) {
			// Still return success for security, but include a subtle indicator
			// that the frontend can interpret without exposing to attackers
			res.json({
				success: true,
				message:
					'If an account with that email exists, we sent a password reset link.',
				status: 'check_complete', // Special key frontend can check
			});
			return;
		}

		// Generate reset token
		const resetToken = generatePasswordResetToken();
		const hashedToken =
			await hashPasswordResetToken(resetToken);
		const expiresAt = generatePasswordResetExpiration();

		// Save reset token to database
		await prisma.user.update({
			where: { id: user.id },
			data: {
				passwordResetToken: hashedToken,
				passwordResetExpires: expiresAt,
				updatedAt: new Date(),
			},
		});

		// Send password reset email
		const emailSent =
			await emailService.sendPasswordResetEmail(
				user.email,
				user.firstName,
				resetToken
			);

		if (!emailSent) {
			console.error(
				'Failed to send password reset email'
			);
			// Return success but with a subtle indicator that email failed
			res.json({
				success: true,
				message:
					'If an account with that email exists, we sent a password reset link.',
				status: 'email_attempt_complete',
			});
			return;
		}

		// Return success for actual email sent
		res.json({
			success: true,
			message:
				'If an account with that email exists, we sent a password reset link.',
			status: 'email_sent',
		});
	} catch (error) {
		console.error(
			'Request password reset error:',
			error
		);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

/**
 * Get email service status (for debugging)
 */
export const getEmailStatus = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const status = emailService.getStatus();
		res.json({
			success: true,
			data: {
				...status,
				// Mask the API key for security
				hasApiKey: status.hasApiKey
					? 'Present'
					: 'Missing',
			},
		});
	} catch (error) {
		console.error('Get email status error:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

export const resetPassword = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { token, email, newPassword } = req.body;

		// Find user by email
		const user = await prisma.user.findUnique({
			where: { email },
		});

		if (
			!user ||
			!user.passwordResetToken ||
			!user.passwordResetExpires
		) {
			res.status(400).json({
				success: false,
				message: 'Invalid or expired reset token',
			});
			return;
		}

		// Check if token is expired
		if (
			isPasswordResetTokenExpired(
				user.passwordResetExpires
			)
		) {
			res.status(400).json({
				success: false,
				message: 'Reset token has expired',
			});
			return;
		}

		// Verify reset token
		const isValidToken = await verifyPasswordResetToken(
			token,
			user.passwordResetToken
		);

		if (!isValidToken) {
			res.status(400).json({
				success: false,
				message: 'Invalid reset token',
			});
			return;
		}

		// Hash new password
		const hashedNewPassword =
			await PasswordUtils.hashPassword(newPassword);

		// Update password and clear reset token
		await prisma.user.update({
			where: { id: user.id },
			data: {
				password: hashedNewPassword,
				passwordResetToken: null,
				passwordResetExpires: null,
				updatedAt: new Date(),
			},
		});

		// Invalidate all sessions for security
		await prisma.session.deleteMany({
			where: { userId: user.id },
		});

		// Send password change confirmation email
		emailService
			.sendPasswordChangeConfirmation(
				user.email,
				user.firstName
			)
			.catch((error) =>
				console.error(
					'Password change confirmation email failed:',
					error
				)
			);

		res.json({
			success: true,
			message:
				'Password reset successfully. Please login with your new password.',
		});
	} catch (error) {
		console.error('Reset password error:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

export const verifyEmail = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { token, email } = req.body;

		// Find user by email
		const user = await prisma.user.findUnique({
			where: { email },
		});

		if (
			!user ||
			!user.emailVerificationToken ||
			!user.emailVerificationExpires
		) {
			res.status(400).json({
				success: false,
				message:
					'Invalid or expired verification token',
			});
			return;
		}

		// Check if user is already verified
		if (user.isVerified) {
			res.status(400).json({
				success: false,
				message: 'Email is already verified',
			});
			return;
		}

		// Check if token is expired
		if (
			isEmailVerificationTokenExpired(
				user.emailVerificationExpires
			)
		) {
			res.status(400).json({
				success: false,
				message: 'Verification token has expired',
			});
			return;
		}

		// Verify token
		const isValidToken =
			await verifyEmailVerificationToken(
				token,
				user.emailVerificationToken
			);

		if (!isValidToken) {
			res.status(400).json({
				success: false,
				message: 'Invalid verification token',
			});
			return;
		}

		// Update user as verified and clear verification token
		await prisma.user.update({
			where: { id: user.id },
			data: {
				isVerified: true,
				emailVerificationToken: null,
				emailVerificationExpires: null,
				updatedAt: new Date(),
			},
		});

		// Send welcome email after successful verification
		emailService
			.sendWelcomeEmail(
				user.email,
				user.firstName,
				user.lastName
			)
			.catch((error) =>
				console.error(
					'Welcome email failed:',
					error
				)
			);

		// Generate JWT tokens now that user is verified
		const accessToken = JWTUtils.generateAccessToken({
			userId: user.id,
			email: user.email,
		});

		const refreshToken = JWTUtils.generateRefreshToken({
			userId: user.id,
			email: user.email,
		});

		res.json({
			success: true,
			message: 'Email verified successfully',
			data: {
				user: {
					id: user.id,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					isVerified: true,
				},
				accessToken,
				refreshToken,
			},
		});
	} catch (error) {
		console.error('Email verification error:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

export const resendVerificationEmail = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { email } = req.body;

		// Find user by email
		const user = await prisma.user.findUnique({
			where: { email },
		});

		if (!user) {
			res.status(400).json({
				success: false,
				message: 'User not found',
			});
			return;
		}

		if (user.isVerified) {
			res.status(400).json({
				success: false,
				message: 'Email is already verified',
			});
			return;
		}

		// Generate new verification token
		const verificationToken =
			generateEmailVerificationToken();
		const hashedVerificationToken =
			await hashEmailVerificationToken(
				verificationToken
			);
		const verificationExpires =
			generateEmailVerificationExpiration();

		// Update user with new verification token
		await prisma.user.update({
			where: { id: user.id },
			data: {
				emailVerificationToken:
					hashedVerificationToken,
				emailVerificationExpires:
					verificationExpires,
				updatedAt: new Date(),
			},
		});

		// Send new verification email
		const emailSent =
			await emailService.sendEmailVerification(
				user.email,
				user.firstName,
				verificationToken
			);

		if (!emailSent) {
			console.error(
				'Failed to send verification email'
			);
			res.status(500).json({
				success: false,
				message:
					'Failed to send verification email',
			});
			return;
		}

		res.json({
			success: true,
			message: 'Verification email sent successfully',
		});
	} catch (error) {
		console.error(
			'Resend verification email error:',
			error
		);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
		});
	}
};

// uploadProfilePicture function removed - now handled by uploadController.ts with Cloudinary
