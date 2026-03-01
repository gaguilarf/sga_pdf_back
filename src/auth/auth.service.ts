import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(password: string): Promise<{ access_token: string; role: string; name: string }> {
    const pepper = this.configService.get<string>('PASSWORD_PEPPER', 'brittany_x9K@3z');

    // Try both roles — whoever matches wins
    const roles = [UserRole.DEVELOPER, UserRole.TEACHER];

    for (const role of roles) {
      const user = await this.usersService.findByRole(role);
      if (!user || !user.active) continue;

      // Check lockout
      if (user.failedAttempts >= MAX_FAILED_ATTEMPTS && user.lastFailedAt) {
        const elapsed = Date.now() - new Date(user.lastFailedAt).getTime();
        if (elapsed < LOCKOUT_DURATION_MS) {
          const minutesLeft = Math.ceil((LOCKOUT_DURATION_MS - elapsed) / 60000);
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: `Demasiados intentos fallidos. Inténtalo de nuevo en ${minutesLeft} minutos.`,
              minutesLeft,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        } else {
          // Lockout expired — reset
          await this.usersService.resetFailedAttempts(user.id);
          user.failedAttempts = 0;
        }
      }

      const isMatch = await bcrypt.compare(password + pepper, user.password);
      if (isMatch) {
        // Successful login — reset failed attempts
        await this.usersService.resetFailedAttempts(user.id);

        const payload = { sub: user.id, role: user.role, name: user.name };
        const access_token = await this.jwtService.signAsync(payload);

        return {
          access_token,
          role: user.role,
          name: user.name,
        };
      } else {
        // Wrong password for this user — increment their counter
        await this.usersService.incrementFailedAttempts(user.id);
      }
    }

    // No role matched — generic error (don't reveal which user failed)
    throw new UnauthorizedException('Contraseña incorrecta.');
  }
}
