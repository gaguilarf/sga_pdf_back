import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';

class LoginDto {
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
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.password);
  }
}
