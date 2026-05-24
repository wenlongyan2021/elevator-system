import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractQueryDto } from './dto/contract-query.dto';
import { AddElevatorDto } from './dto/add-elevator.dto';
import { CreatePartDto } from './dto/create-part.dto';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('合同管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  @ApiOperation({ summary: '创建合同' })
  create(@Body() dto: CreateContractDto) {
    return this.contractService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取合同列表' })
  findAll(@Query() query: ContractQueryDto) {
    return this.contractService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取合同详情' })
  findOne(@Param('id') id: string) {
    return this.contractService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新合同' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
  ) {
    return this.contractService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除合同' })
  async remove(@Param('id') id: string) {
    await this.contractService.remove(id);
    return { message: '删除成功' };
  }

  @Post(':id/elevators')
  @ApiOperation({ summary: '添加电梯到合同' })
  addElevators(
    @Param('id') id: string,
    @Body() dto: AddElevatorDto,
  ) {
    return this.contractService.addElevators(id, dto);
  }

  @Delete(':id/elevators/:elevatorId')
  @ApiOperation({ summary: '从合同移除电梯' })
  removeElevator(
    @Param('id') id: string,
    @Param('elevatorId') elevatorId: string,
  ) {
    return this.contractService.removeElevator(id, elevatorId);
  }

  @Post(':id/parts')
  @ApiOperation({ summary: '添加配件' })
  addPart(
    @Param('id') id: string,
    @Body() dto: CreatePartDto,
  ) {
    return this.contractService.addPart(id, dto);
  }

  @Get(':id/parts')
  @ApiOperation({ summary: '获取配件列表' })
  getParts(@Param('id') id: string) {
    return this.contractService.getParts(id);
  }

  @Put(':id/parts/:partId')
  @ApiOperation({ summary: '更新配件' })
  updatePart(
    @Param('id') id: string,
    @Param('partId') partId: string,
    @Body() dto: CreatePartDto,
  ) {
    return this.contractService.updatePart(id, partId, dto);
  }

  @Delete(':id/parts/:partId')
  @ApiOperation({ summary: '删除配件' })
  async deletePart(
    @Param('id') id: string,
    @Param('partId') partId: string,
  ) {
    await this.contractService.deletePart(id, partId);
    return { message: '删除成功' };
  }

  @Post(':id/evaluations')
  @ApiOperation({ summary: '添加考核记录' })
  addEvaluation(
    @Param('id') id: string,
    @Body() dto: CreateEvaluationDto,
  ) {
    return this.contractService.addEvaluation(id, dto);
  }

  @Get(':id/evaluations')
  @ApiOperation({ summary: '获取考核记录列表' })
  getEvaluations(@Param('id') id: string) {
    return this.contractService.getEvaluations(id);
  }

  @Put(':id/evaluations/:evalId')
  @ApiOperation({ summary: '更新考核记录' })
  updateEvaluation(
    @Param('id') id: string,
    @Param('evalId') evalId: string,
    @Body() dto: CreateEvaluationDto,
  ) {
    return this.contractService.updateEvaluation(id, evalId, dto);
  }

  @Delete(':id/evaluations/:evalId')
  @ApiOperation({ summary: '删除考核记录' })
  async deleteEvaluation(
    @Param('id') id: string,
    @Param('evalId') evalId: string,
  ) {
    await this.contractService.deleteEvaluation(id, evalId);
    return { message: '删除成功' };
  }

  @Post('import')
  @ApiOperation({ summary: 'Excel导入合同数据' })
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
    return this.contractService.importFromExcel(file);
  }

  @Post('export')
  @ApiOperation({ summary: '导出合同数据为Excel' })
  async export(@Body() query: ContractQueryDto, @Res() res: Response) {
    const buffer = await this.contractService.exportToExcel(query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="contracts-${Date.now()}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
