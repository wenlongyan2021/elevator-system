import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ElevatorService } from './elevator.service';
import { CreateElevatorDto } from './dto/create-elevator.dto';
import { UpdateElevatorDto } from './dto/update-elevator.dto';
import { ElevatorQueryDto } from './dto/elevator-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('电梯台账')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('elevators')
export class ElevatorController {
  constructor(private readonly elevatorService: ElevatorService) {}

  @Post()
  @ApiOperation({ summary: '创建电梯' })
  create(@Body() dto: CreateElevatorDto) {
    return this.elevatorService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取电梯列表' })
  findAll(@Query() query: ElevatorQueryDto) {
    return this.elevatorService.findAll(query);
  }

  @Get('upcoming-inspections')
  @ApiOperation({ summary: '获取即将年检的电梯列表（一个月内）' })
  findUpcomingInspections() {
    return this.elevatorService.findUpcomingInspections();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取电梯详情' })
  findOne(@Param('id') id: string) {
    return this.elevatorService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新电梯' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateElevatorDto,
  ) {
    return this.elevatorService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除电梯' })
  async remove(@Param('id') id: string) {
    await this.elevatorService.remove(id);
    return { message: '删除成功' };
  }

  @Post('import')
  @ApiOperation({ summary: 'Excel导入电梯数据' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Excel文件',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async import(@UploadedFile() file: Express.Multer.File) {
    return this.elevatorService.importFromExcel(file);
  }

  @Post('export')
  @ApiOperation({ summary: '导出电梯数据为Excel' })
  async export(
    @Body() query: ElevatorQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.elevatorService.exportToExcel(query);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="elevators_${Date.now()}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
