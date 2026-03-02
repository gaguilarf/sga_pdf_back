import { Body, Controller, Post, Get, HttpCode, HttpStatus, Res, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { IsString, IsNotEmpty } from 'class-validator';

class LoginDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con contraseña' })
  @ApiBody({ schema: { example: { password: 'tu_contraseña' } } })
  @ApiResponse({ status: 200, description: 'Retorna access_token y role' })
  @ApiResponse({ status: 401, description: 'Contraseña incorrecta' })
  @ApiResponse({ status: 429, description: 'Demasiados intentos fallidos' })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: any,
  ) {
    const result = await this.authService.login(body.password);
    
    response.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000, // 12 hours (matches JWT_EXPIRES_IN)
    });

    return {
      role: result.role,
      name: result.name,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  @ApiResponse({ status: 200, description: 'Retorna datos del usuario' })
  async getProfile(@Req() req: any) {
    return {
      userId: req.user.userId,
      role: req.user.role,
      name: req.user.name,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout(@Res({ passthrough: true }) response: any) {
    response.clearCookie('access_token');
    return { message: 'Logged out successfully' };
  }
}
