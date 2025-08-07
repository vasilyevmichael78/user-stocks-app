import { Controller, Post, Body, ValidationPipe, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { CustomLoggerService } from '../common/logger/logger.service';
import { SensitiveEndpoint, BusinessEvent } from '../common/decorators/logging.decorators';
import type { LoginDto, RegisterDto, AuthResponse } from '@user-stocks-app/shared-types';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private logger: CustomLoggerService,
  ) {
    this.logger.setContext('AuthController');
  }

  @Post('register')
  @SensitiveEndpoint()
  @BusinessEvent('user_registration')
  async register(
    @Body(ValidationPipe) registerDto: RegisterDto,
    @Req() request: Request,
  ): Promise<AuthResponse> {
    this.logger.logSecurityEvent('user_registration_attempt', {
      email: registerDto.email,
      ip: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
    });

    try {
      const result = await this.authService.register(registerDto);
      
      this.logger.logBusinessEvent('user_registered_successfully', {
        userId: result.user.id,
        email: result.user.email,
        ip: this.getClientIp(request),
      });

      return result;
    } catch (error) {
      this.logger.logSecurityEvent('user_registration_failed', {
        email: registerDto.email,
        error: error instanceof Error ? error.message : String(error),
        ip: this.getClientIp(request),
      });
      throw error;
    }
  }

  @Post('login')
  @SensitiveEndpoint()
  @BusinessEvent('user_login')
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Req() request: Request,
  ): Promise<AuthResponse> {
    this.logger.logSecurityEvent('user_login_attempt', {
      email: loginDto.email,
      ip: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
    });

    try {
      const result = await this.authService.login(loginDto);
      
      this.logger.logBusinessEvent('user_logged_in_successfully', {
        userId: result.user.id,
        email: result.user.email,
        ip: this.getClientIp(request),
      });

      return result;
    } catch (error) {
      this.logger.logSecurityEvent('user_login_failed', {
        email: loginDto.email,
        error: error instanceof Error ? error.message : String(error),
        ip: this.getClientIp(request),
      });
      throw error;
    }
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}
