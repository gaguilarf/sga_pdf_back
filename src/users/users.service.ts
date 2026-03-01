import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepo.find();
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id, active: true } });
  }

  async findByRole(role: UserRole): Promise<User | null> {
    return this.usersRepo.findOne({ where: { role, active: true } });
  }

  async incrementFailedAttempts(id: string): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) return;
    user.failedAttempts += 1;
    user.lastFailedAt = new Date();
    await this.usersRepo.save(user);
  }

  async resetFailedAttempts(id: string): Promise<void> {
    await this.usersRepo.update(id, { failedAttempts: 0, lastFailedAt: null });
  }

  /** Called on app startup to ensure both users exist */
  async seedUsers(): Promise<void> {
    const pepper = this.configService.get<string>('PASSWORD_PEPPER', 'brittany_x9K@3z');
    const saltRounds = 12;

    const devPassword = this.configService.get<string>('DEVELOPER_PASSWORD', 'Br1tt@nyDev2024!');
    const teacherPassword = this.configService.get<string>('TEACHER_PASSWORD', 'Cl@ss3SGA#25');

    const devExists = await this.usersRepo.findOne({ where: { role: UserRole.DEVELOPER } });
    if (!devExists) {
      const hash = await bcrypt.hash(devPassword + pepper, saltRounds);
      await this.usersRepo.save({
        name: 'Developer',
        role: UserRole.DEVELOPER,
        password: hash,
        active: true,
        failedAttempts: 0,
        lastFailedAt: null,
      });
      console.log('✅ Usuario developer creado.');
    }

    const teacherExists = await this.usersRepo.findOne({ where: { role: UserRole.TEACHER } });
    if (!teacherExists) {
      const hash = await bcrypt.hash(teacherPassword + pepper, saltRounds);
      await this.usersRepo.save({
        name: 'Teacher',
        role: UserRole.TEACHER,
        password: hash,
        active: true,
        failedAttempts: 0,
        lastFailedAt: null,
      });
      console.log('✅ Usuario teacher creado.');
    }
  }
}
