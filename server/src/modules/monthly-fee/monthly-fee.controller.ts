import {
  Controller, Get, Post, Put, Param, Query, Body, Res, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { MonthlyFeeService } from './monthly-fee.service';
import { MonthlyFeeQueryDto, GenerateFeeDto, UpdateMonthlyFeeStatusDto } from './dto/monthly-fee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('月费管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('monthly-fees')
export class MonthlyFeeController {
  constructor(private readonly service: MonthlyFeeService) {}

  @Post('generate')
  @ApiOperation({ summary: '自动生成月费' })
  generate(@Body() dto: GenerateFeeDto) {
    return this.service.generate(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取月费列表' })
  findAll(@Query() query: MonthlyFeeQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取月费详情' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新月费状态' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateMonthlyFeeStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }

  @Post('import')
  @ApiOperation({ summary: 'Excel导入月费数据' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async import(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请上传文件');
    return this.service.importFromExcel(file);
  }

  @Post('export')
  @ApiOperation({ summary: '导出月费列表为Excel' })
  async export(@Body() query: MonthlyFeeQueryDto, @Res() res: Response) {
    const buffer = await this.service.exportToExcel(query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="monthly-fees-${Date.now()}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
