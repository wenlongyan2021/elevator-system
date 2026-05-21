import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../common/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class QRCodeService {
  private readonly logger = new Logger(QRCodeService.name);
  private readonly uploadBasePath: string;
  private readonly qrUrlPrefix: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.uploadBasePath = this.config.get<string>('UPLOAD_PATH', path.join(process.cwd(), 'uploads'));
    this.qrUrlPrefix = this.config.get<string>('QR_URL_PREFIX', '/uploads/qrcodes');
  }

  private getQrDir(): string {
    return path.join(this.uploadBasePath, 'qrcodes');
  }

  private getQrCodeContent(elevatorId: string): string {
    return `elevator://scan?elevatorId=${elevatorId}`;
  }

  async generateQR(elevatorId: string) {
    const elevator = await this.prisma.elevator.findUnique({
      where: { id: elevatorId },
    });
    if (!elevator) {
      throw new NotFoundException('电梯不存在');
    }

    const existing = await this.prisma.qRCode.findUnique({
      where: { elevatorId },
    });
    if (existing) {
      throw new ConflictException('该电梯已生成二维码，如需重新生成请使用重新生成接口');
    }

    const code = this.getQrCodeContent(elevatorId);

    const qrDir = this.getQrDir();
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

    const fileName = `qrcode_${elevatorId}.png`;
    const filePath = path.join(qrDir, fileName);

    await QRCode.toFile(filePath, code, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    const qrRecord = await this.prisma.qRCode.create({
      data: {
        elevatorId,
        code,
        qrImagePath: `${this.qrUrlPrefix}/${fileName}`,
      },
      include: {
        elevator: {
          select: {
            id: true,
            regCode: true,
            brand: true,
            locationDesc: true,
            project: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return qrRecord;
  }

  async getQRByElevator(elevatorId: string) {
    const qr = await this.prisma.qRCode.findUnique({
      where: { elevatorId },
      include: {
        elevator: {
          select: {
            id: true,
            regCode: true,
            brand: true,
            model: true,
            locationDesc: true,
            status: true,
            project: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!qr) {
      throw new NotFoundException('该电梯未生成二维码');
    }

    return qr;
  }

  async getAllQRCodes() {
    return this.prisma.qRCode.findMany({
      include: {
        elevator: {
          select: {
            id: true,
            regCode: true,
            brand: true,
            model: true,
            locationDesc: true,
            status: true,
            project: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async regenerateQR(elevatorId: string) {
    const elevator = await this.prisma.elevator.findUnique({
      where: { id: elevatorId },
    });
    if (!elevator) {
      throw new NotFoundException('电梯不存在');
    }

    const existing = await this.prisma.qRCode.findUnique({
      where: { elevatorId },
    });

    if (existing) {
      if (existing.qrImagePath) {
        const oldPath = path.join(this.getQrDir(), path.basename(existing.qrImagePath));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      await this.prisma.qRCode.delete({
        where: { elevatorId },
      });
    }

    return this.generateQR(elevatorId);
  }

  async getQRImageBuffer(elevatorId: string): Promise<Buffer> {
    const elevator = await this.prisma.elevator.findUnique({
      where: { id: elevatorId },
    });
    if (!elevator) {
      throw new NotFoundException('电梯不存在');
    }

    const code = this.getQrCodeContent(elevatorId);

    return QRCode.toBuffer(code, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  }
}
