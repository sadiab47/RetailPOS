import { Inject, Injectable } from '@nestjs/common';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { LoginDto, RegisterDto, RefreshTokenDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(@Inject('DATABASE_POOL') private readonly db: Pool) {}

  private getJwtSecret(): string {
    return process.env.JWT_SECRET || 'default_jwt_secret';
  }

  private getJwtAccessExpiry(): string {
    return process.env.JWT_EXPIRES_IN || '15m';
  }

  private getJwtRefreshExpiry(): string {
    return process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  }

  private async hashValue(value: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(value, salt);
  }

  private async compareHash(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }

  private async generateTokens(payload: { id: number; email: string; role: string }) {
    const secret: jwt.Secret = this.getJwtSecret();
    const signOptions: jwt.SignOptions = {
      expiresIn: this.getJwtAccessExpiry() as jwt.SignOptions['expiresIn'],
    };

    const accessToken = jwt.sign(payload, secret, signOptions);
    const refreshToken = jwt.sign(payload, secret, {
      expiresIn: this.getJwtRefreshExpiry() as jwt.SignOptions['expiresIn'],
    });

    return { accessToken, refreshToken };
  }

  private async saveRefreshHash(userId: number, refreshToken: string) {
    const refreshTokenHash = await this.hashValue(refreshToken);
    await this.db.query<ResultSetHeader>('UPDATE users SET refresh_token_hash = ? WHERE id = ?', [refreshTokenHash, userId]);
  }

  private async findUserByEmail(email: string) {
    const [rows] = await this.db.query<RowDataPacket[]>('SELECT id, name, email, password_hash, role, refresh_token_hash FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0];
  }

  private async findUserById(id: number) {
    const [rows] = await this.db.query<RowDataPacket[]>('SELECT id, name, email, role, refresh_token_hash FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0];
  }

  async login(loginDto: LoginDto) {
    const user = await this.findUserByEmail(loginDto.email);

    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }

    const passwordMatches = await this.compareHash(loginDto.password, user.password_hash);
    if (!passwordMatches) {
      return { success: false, message: 'Invalid credentials' };
    }

    const tokens = await this.generateTokens({ id: user.id, email: user.email, role: user.role });
    await this.saveRefreshHash(user.id, tokens.refreshToken);

    return {
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async register(registerDto: RegisterDto) {
    const [existing] = await this.db.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [registerDto.email]);
    if (existing.length) {
      return { success: false, message: 'Email already exists' };
    }

    const passwordHash = await this.hashValue(registerDto.password);
    const [result] = await this.db.query<ResultSetHeader>(
      'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, NOW())',
      [registerDto.name, registerDto.email, passwordHash, registerDto.role ?? 'cashier'],
    );

    const tokens = await this.generateTokens({ id: result.insertId, email: registerDto.email, role: registerDto.role ?? 'cashier' });
    await this.saveRefreshHash(result.insertId, tokens.refreshToken);

    return {
      success: true,
      user: {
        id: result.insertId,
        name: registerDto.name,
        email: registerDto.email,
        role: registerDto.role ?? 'cashier',
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    try {
      const secret: jwt.Secret = this.getJwtSecret();
      const decoded = jwt.verify(refreshTokenDto.refreshToken, secret) as { id: number; email: string; role: string };
      const storedUser = await this.findUserById(decoded.id);

      if (!storedUser || !storedUser.refresh_token_hash) {
        return { success: false, message: 'Invalid refresh token' };
      }

      const matches = await this.compareHash(refreshTokenDto.refreshToken, storedUser.refresh_token_hash);
      if (!matches) {
        return { success: false, message: 'Invalid refresh token' };
      }

      const tokens = await this.generateTokens({ id: decoded.id, email: decoded.email, role: decoded.role });
      await this.saveRefreshHash(decoded.id, tokens.refreshToken);

      return {
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      return { success: false, message: 'Invalid or expired refresh token' };
    }
  }
}
