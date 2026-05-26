import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(account: string, password: string) {
    let user = await this.prisma.user.findUnique({ where: { username: account } });
    if (!user) {
      user = await this.prisma.user.findUnique({ where: { phone: account } });
    }
    if (!user) return null;
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;
    const { password: _, ...result } = user;
    return result;
  }

  async login(account: string, password: string) {
    const user = await this.validateUser(account, password);
    if (!user) throw new UnauthorizedException('账号或密码错误');
    return this.generateToken(user);
  }

  async wechatLogin(code: string, userInfo?: { name?: string; avatar?: string }) {
    const appid = this.config.get<string>('WECHAT_APPID');
    const secret = this.config.get<string>('WECHAT_SECRET');

    if (!appid || !secret) {
      this.logger.error('WECHAT_APPID or WECHAT_SECRET not configured');
      throw new UnauthorizedException('微信登录未配置');
    }

    // Exchange code for openid via WeChat jscode2session API
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    const res = await fetch(url);
    const data: any = await res.json();

    if (data.errcode || !data.openid) {
      this.logger.error(`WeChat login failed: errcode=${data.errcode}, errmsg=${data.errmsg}`);
      throw new UnauthorizedException('微信登录失败，请重新尝试');
    }

    const openid: string = data.openid;
    this.logger.log(`WeChat login success: openid=${openid.slice(0, 8)}...`);

    let user = await this.prisma.user.findUnique({ where: { wxOpenId: openid } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: userInfo?.name || `微信用户_${openid.slice(-4)}`,
          username: `wx_${openid.slice(-10)}`,
          phone: `wx_${openid.slice(-10)}`,
          password: await bcrypt.hash('wx_user', 10),
          wxOpenId: openid,
          avatar: userInfo?.avatar,
          role: 'CUSTOMER_SERVICE',
        },
      });
    }
    const { password: _, ...result } = user;
    return this.generateToken(result);
  }

  private generateToken(user: any) {
    const payload = { sub: user.id, username: user.username, phone: user.phone, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, username: true, phone: true, role: true, avatar: true, title: true },
    });
  }
}
