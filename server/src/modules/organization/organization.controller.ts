import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateOrgDto } from './dto/create-org.dto';
import { UpdateOrgDto } from './dto/update-org.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('组织架构')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class OrganizationController {
  constructor(private service: OrganizationService) {}

  // ---- Organization ----
  @Post('organizations')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '创建集团' })
  createOrg(@Body() dto: CreateOrgDto) {
    return this.service.createOrg(dto);
  }

  @Put('organizations/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '更新集团' })
  updateOrg(@Param('id') id: string, @Body() dto: UpdateOrgDto) {
    return this.service.updateOrg(id, dto);
  }

  @Get('organizations')
  @ApiOperation({ summary: '获取集团列表' })
  getOrgs() {
    return this.service.getOrgs();
  }

  @Get('organizations/:id')
  @ApiOperation({ summary: '获取集团详情' })
  getOrg(@Param('id') id: string) {
    return this.service.getOrg(id);
  }

  // ---- Project ----
  @Post('projects')
  @Roles(Role.ADMIN, Role.PROJECT_SUPERVISOR)
  @ApiOperation({ summary: '创建项目/小区' })
  createProject(@Body() dto: CreateProjectDto) {
    return this.service.createProject(dto);
  }

  @Put('projects/:id')
  @Roles(Role.ADMIN, Role.PROJECT_SUPERVISOR)
  @ApiOperation({ summary: '更新项目/小区' })
  updateProject(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.service.updateProject(id, dto);
  }

  @Get('projects')
  @ApiOperation({ summary: '获取项目列表' })
  getProjects(@Query('orgId') orgId?: string) {
    return this.service.getProjects(orgId);
  }

  @Get('projects/:id')
  @ApiOperation({ summary: '获取项目详情' })
  getProject(@Param('id') id: string) {
    return this.service.getProject(id);
  }

  // ---- User ----
  @Post('users')
  @Roles(Role.ADMIN, Role.PROJECT_SUPERVISOR)
  @ApiOperation({ summary: '创建用户' })
  createUser(@Body() dto: CreateUserDto) {
    return this.service.createUser(dto);
  }

  @Get('users')
  @ApiOperation({ summary: '获取用户列表' })
  getUsers(
    @Query('projectId') projectId?: string,
    @Query('role') role?: Role,
  ) {
    return this.service.getUsers(projectId, role);
  }

  @Put('users/:id')
  @Roles(Role.ADMIN, Role.PROJECT_SUPERVISOR)
  @ApiOperation({ summary: '更新用户' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.updateUser(id, dto);
  }

  @Delete('users/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '删除用户(软删除)' })
  async deleteUser(@Param('id') id: string) {
    await this.service.deleteUser(id);
    return { message: '删除成功' };
  }

  @Put('users/:id/password')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '重置用户密码' })
  async resetPassword(@Param('id') id: string, @Body() data: { password: string }) {
    await this.service.resetPassword(id, data.password);
    return { message: '密码重置成功' };
  }

  @Delete('projects/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '删除项目' })
  async deleteProject(@Param('id') id: string) {
    await this.service.deleteProject(id);
    return { message: '删除成功' };
  }

  @Get('users/hierarchy')
  @ApiOperation({ summary: '获取用户组织架构树' })
  getUserHierarchy() {
    return this.service.getUserHierarchy();
  }
}
