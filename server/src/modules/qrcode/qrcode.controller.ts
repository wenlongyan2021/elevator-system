import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QRCodeService } from './qrcode.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('二维码')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('qrcodes')
export class QRCodeController {
  constructor(private readonly qrCodeService: QRCodeService) {}

  @Post(':elevatorId')
  @ApiOperation({ summary: '生成电梯二维码' })
  async generate(@Param('elevatorId') elevatorId: string) {
    return this.qrCodeService.generateQR(elevatorId);
  }

  @Get(':elevatorId')
  @ApiOperation({ summary: '获取电梯二维码信息' })
  async getByElevator(@Param('elevatorId') elevatorId: string) {
    return this.qrCodeService.getQRByElevator(elevatorId);
  }

  @Get()
  @ApiOperation({ summary: '获取所有二维码列表' })
  async getAll() {
    return this.qrCodeService.getAllQRCodes();
  }

  @Put(':elevatorId/regenerate')
  @ApiOperation({ summary: '重新生成电梯二维码' })
  async regenerate(@Param('elevatorId') elevatorId: string) {
    return this.qrCodeService.regenerateQR(elevatorId);
  }
}
