import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  // Organization
  async createOrg(data: { name: string; address?: string; phone?: string }) {
    return this.prisma.organization.create({ data });
  }

  async getOrgs() {
    return this.prisma.organization.findMany({ include: { _count: { select: { projects: true } } } });
  }

  async getOrg(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { projects: true },
    });
    if (!org) throw new NotFoundException('组织不存在');
    return org;
  }

  async updateOrg(id: string, data: { name?: string; address?: string; phone?: string }) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('组织不存在');
    return this.prisma.organization.update({ where: { id }, data });
  }

  // Project
  async createProject(data: { name: string; organizationId: string; address?: string }) {
    return this.prisma.project.create({ data });
  }

  async updateProject(id: string, data: { name?: string; address?: string }) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    return this.prisma.project.update({ where: { id }, data });
  }

  async getProjects(orgId?: string) {
    const where = orgId ? { organizationId: orgId } : {};
    return this.prisma.project.findMany({
      where,
      include: { _count: { select: { elevators: true, buildings: true } } },
    });
  }

  async getProject(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { buildings: true, elevators: true },
    });
    if (!project) throw new NotFoundException('项目不存在');
    return project;
  }

  // User
  async createUser(data: {
    name: string;
    phone: string;
    username?: string;
    password?: string;
    role: Role;
    supervisorId?: string;
    maintenanceUnitId?: string;
    projectIds?: string[];
  }) {
    const password = data.password || '123456';
    const hashedPassword = await bcrypt.hash(password, 10);
    const username = data.username || data.phone;

    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        username,
        phone: data.phone,
        password: hashedPassword,
        role: data.role,
        supervisorId: data.supervisorId,
        maintenanceUnitId: data.maintenanceUnitId,
      },
    });

    if (data.projectIds?.length) {
      await this.prisma.userProject.createMany({
        data: data.projectIds.map((projectId) => ({
          userId: user.id,
          projectId,
        })),
      });
    }

    const { password: _, ...result } = user;
    return result;
  }

  async getUsers(projectId?: string, role?: Role, showInactive?: boolean) {
    const where: any = {};
    if (role) where.role = role;
    // Hide soft-deleted users unless explicitly requested
    if (!showInactive) where.isActive = true;
    if (projectId) {
      where.projects = { some: { projectId } };
    }
    return this.prisma.user.findMany({
      where,
      select: {
        id: true, name: true, username: true, phone: true, role: true, title: true,
        avatar: true, isActive: true, supervisorId: true, maintenanceUnitId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUser(id: string, data: {
    name?: string; role?: Role; supervisorId?: string; isActive?: boolean; projectIds?: string[];
  }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');

    if (data.projectIds) {
      await this.prisma.userProject.deleteMany({ where: { userId: id } });
      await this.prisma.userProject.createMany({
        data: data.projectIds.map((projectId) => ({ userId: id, projectId })),
      });
    }

    const { projectIds, ...updateData } = data;
    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, name: true, phone: true, role: true, title: true,
        avatar: true, isActive: true, supervisorId: true, createdAt: true,
      },
    });
  }

  async getUserHierarchy() {
    // Return users grouped by supervisor relationship
    const users = await this.prisma.user.findMany({
      select: {
        id: true, name: true, phone: true, role: true, title: true,
        supervisorId: true, isActive: true,
      },
    });

    const map = new Map(users.map((u) => [u.id, { ...u, subordinates: [] as any[] }]));
    const roots: any[] = [];

    for (const user of map.values()) {
      if (user.supervisorId && map.has(user.supervisorId)) {
        map.get(user.supervisorId)!.subordinates.push(user);
      } else {
        roots.push(user);
      }
    }

    return roots;
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    // Soft delete: deactivate instead of removing
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }

  async resetPassword(id: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    if (!password || password.length < 6) {
      throw new BadRequestException('密码长度至少6位');
    }
    const hashed = await bcrypt.hash(password, 10);
    await this.prisma.user.update({ where: { id }, data: { password: hashed } });
  }

  async deleteProject(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    // Check for associated elevators
    const elevatorCount = await this.prisma.elevator.count({ where: { projectId: id } });
    if (elevatorCount > 0) {
      throw new BadRequestException(`该项目下仍有 ${elevatorCount} 台电梯，无法删除`);
    }
    await this.prisma.project.delete({ where: { id } });
  }
}
