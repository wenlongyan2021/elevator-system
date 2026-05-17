import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) return null;
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;
    const { password: _, ...result } = user;
    return result;
  }

  async login(phone: string, password: string) {
    const user = await this.validateUser(phone, password);
    if (!user) throw new UnauthorizedException('手机号或密码错误');
    return this.generateToken(user);
  }

  async wechatLogin(code: string, userInfo?: { name?: string; avatar?: string }) {
    // In production, call WeChat jscode2session API
    // const session = await this.wechatService.jscode2session(code);
    // For now, use a mock openId
    const mockOpenId = `mock_openid_${code}`;

    let user = await this.prisma.user.findUnique({ where: { wxOpenId: mockOpenId } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: userInfo?.name || `微信用户_${code.slice(-4)}`,
          phone: `wx_${code.slice(-10)}`,
          password: await bcrypt.hash('wx_user', 10),
          wxOpenId: mockOpenId,
          avatar: userInfo?.avatar,
          role: 'CUSTOMER_SERVICE',
        },
      });
    }
    const { password: _, ...result } = user;
    return this.generateToken(result);
  }

  private generateToken(user: any) {
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, phone: true, role: true, avatar: true, title: true },
    });
  }
}
