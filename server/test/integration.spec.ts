import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma.service';

describe('Elevator System API (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let elevatorId: string;
  let contractId: string;
  let contractElevatorId: string;
  let repairOrderId: string;
  let partId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Clean up test data in reverse dependency order
    if (repairOrderId) {
      await prisma.repairPart.deleteMany({ where: { repairId: repairOrderId } }).catch(() => {});
      await prisma.repairMedia.deleteMany({ where: { repairId: repairOrderId } }).catch(() => {});
      await prisma.workflowInstance.deleteMany({ where: { repairOrderId } }).catch(() => {});
      await prisma.repairOrder.deleteMany({ where: { id: repairOrderId } }).catch(() => {});
    }
    if (contractId) {
      await prisma.contractEvaluation.deleteMany({ where: { contractId } }).catch(() => {});
      await prisma.contractPart.deleteMany({ where: { contractId } }).catch(() => {});
      await prisma.contractElevator.deleteMany({ where: { contractId } }).catch(() => {});
      await prisma.contract.deleteMany({ where: { id: contractId } }).catch(() => {});
    }
    if (elevatorId) {
      await prisma.contractElevator.deleteMany({ where: { elevatorId } }).catch(() => {});
      await prisma.qRCode.deleteMany({ where: { elevatorId } }).catch(() => {});
      await prisma.elevator.deleteMany({ where: { id: elevatorId } }).catch(() => {});
    }
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  describe('Auth', () => {
    it('POST /api/auth/login - should login and return token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ phone: '13800000000', password: 'admin123' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.role).toBe('ADMIN');
      adminToken = res.body.accessToken;
    });

    it('GET /api/auth/profile - should return profile with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.phone).toBe('13800000000');
    });

    it('GET /api/auth/profile - should reject without token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // Organization
  // ---------------------------------------------------------------------------
  describe('Organization', () => {
    let orgId: string;

    it('POST /api/organizations - should create organization', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '集成测试集团' })
        .expect(201);

      expect(res.body.name).toBe('集成测试集团');
      orgId = res.body.id;
    });

    it('GET /api/organizations - should list organizations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/projects - should create project', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '集成测试小区', address: '测试地址', organizationId: orgId })
        .expect(201);

      expect(res.body.name).toBe('集成测试小区');
    });

    it('GET /api/projects - should list projects', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/users - should create user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '测试维保员',
          phone: `138${Date.now()}`,
          password: 'test123',
          role: 'ELEVATOR_MAINTAINER',
        })
        .expect(201);

      expect(res.body.name).toBe('测试维保员');
    });

    it('GET /api/users - should list users', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/users/hierarchy - should return hierarchy', async () => {
      await request(app.getHttpServer())
        .get('/api/users/hierarchy')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Elevator
  // ---------------------------------------------------------------------------
  describe('Elevator', () => {
    const testRegCode = `INTG-${Date.now()}`;

    it('POST /api/elevators - should create elevator', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/elevators')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          regCode: testRegCode,
          projectId: 'default-project',
          building: 'A栋',
          brand: '三菱',
          model: 'ELENESSA',
          floorCount: 15,
          capacity: 1000,
          speed: 1.75,
        })
        .expect(201);

      expect(res.body.regCode).toBe(testRegCode);
      elevatorId = res.body.id;
    });

    it('GET /api/elevators - should list with pagination (list format)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/elevators?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.list).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
    });

    it('GET /api/elevators/:id - should get detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/elevators/${elevatorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.regCode).toBe(testRegCode);
      expect(res.body.project).toBeDefined();
    });

    it('PUT /api/elevators/:id - should update elevator', async () => {
      await request(app.getHttpServer())
        .put(`/api/elevators/${elevatorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ building: 'B栋' })
        .expect(200);
    });

    it('GET /api/elevators/upcoming-inspections - should return list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/elevators/upcoming-inspections')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Contract
  // ---------------------------------------------------------------------------
  describe('Contract', () => {
    it('POST /api/contracts - should create contract', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contracts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          contractNo: `CT-${Date.now()}`,
          name: '集成测试合同',
          maintenanceUnit: '集成测试维保公司',
          startDate: '2026-01-01',
          endDate: '2027-12-31',
          monthlyPrice: 500,
          totalPrice: 12000,
          paymentCycle: 'monthly',
          signatory: '测试签约方',
          contactPerson: '测试联系人',
          contactPhone: '13800000001',
        })
        .expect(201);

      expect(res.body.contractNo).toBeDefined();
      contractId = res.body.id;
      expect(res.body.maintenanceUnit).toBeDefined();
    });

    it('GET /api/contracts - should list with pagination (list format)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/contracts?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.list).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/contracts/:id - should get detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/contracts/${contractId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.signatory).toBe('测试签约方');
    });

    it('PUT /api/contracts/:id - should update contract', async () => {
      await request(app.getHttpServer())
        .put(`/api/contracts/${contractId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ remark: '已更新备注' })
        .expect(200);
    });

    it('POST /api/contracts/:id/elevators - should add elevator to contract', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/contracts/${contractId}/elevators`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ elevatorIds: [elevatorId] })
        .expect(201);

      // Store contract-elevator relation ID for cleanup
      const elevators = res.body.elevators || [];
      const rel = elevators.find((e: any) => e.elevatorId === elevatorId);
      if (rel) contractElevatorId = rel.id;
    });

    it('POST /api/contracts/:id/parts - should add contract part', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/contracts/${contractId}/parts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'FREE',
          name: '门锁装置',
          model: 'ML-01',
          unit: '个',
          price: 150,
        })
        .expect(201);

      partId = res.body.id;
    });

    it('GET /api/contracts/:id/parts - should list parts', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/contracts/${contractId}/parts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/contracts/:id/evaluations - should add evaluation', async () => {
      await request(app.getHttpServer())
        .post(`/api/contracts/${contractId}/evaluations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: '2026-05-01',
          score: 95,
          content: '月度考核优秀',
          evaluator: '测试考核人',
        })
        .expect(201);
    });

    it('GET /api/contracts/:id/evaluations - should list evaluations', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/contracts/${contractId}/evaluations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Repair & Workflow
  // ---------------------------------------------------------------------------
  describe('Repair & Workflow', () => {
    it('POST /api/repairs - should create repair order', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/repairs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          elevatorId,
          description: '集成测试故障描述 - 电梯运行异响',
          stopType: '未停梯',
          urgency: 'NORMAL',
        })
        .expect(201);

      expect(res.body.orderNo).toBeDefined();
      expect(res.body.status).toBe('PENDING_ACCEPT');
      repairOrderId = res.body.id;
    });

    it('GET /api/repairs - should list repairs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/repairs?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/repairs/:id - should get repair detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/repairs/${repairOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.description).toContain('异响');
    });

    it('GET /api/workflows/:repairOrderId - should get or init workflow', async () => {
      // Check if workflow exists (may auto-create, or return 404 if not yet)
      const res = await request(app.getHttpServer())
        .get(`/api/workflows/${repairOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Accept either a found workflow or a 404 (not yet initialized)
      expect(res.status === 200 || res.status === 404).toBe(true);
    });

    it('PUT /api/repairs/:id/accept - should accept repair', async () => {
      await request(app.getHttpServer())
        .put(`/api/repairs/${repairOrderId}/accept`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigneeId: 'cmp8ceqps0000ma59dtjka465' })
        .expect(200);
    });

    it('PUT /api/repairs/:id/status - should update status', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/repairs/${repairOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PENDING_REPAIR' })
        .expect(200);

      expect(res.body.status).toBe('PENDING_REPAIR');
    });

    it('POST /api/repairs/:id/parts - should add repair part', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/repairs/${repairOrderId}/parts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partName: '门锁装置',
          partModel: 'ML-01',
          quantity: 2,
          price: 150,
          costType: 'CONTRACT_IN',
        })
        .expect(201);

      expect(res.body.partName).toBe('门锁装置');
    });

    it('GET /api/repairs/:id/parts - should list repair parts', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/repairs/${repairOrderId}/parts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/repairs/:id/costs - should get cost summary', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/repairs/${repairOrderId}/costs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------
  describe('Dashboard', () => {
    it('GET /api/dashboard/overview - should return stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totalElevators).toBeGreaterThanOrEqual(1);
      expect(typeof res.body.runningCount).toBe('number');
      expect(typeof res.body.pendingRepairs).toBe('number');
    });

    it('GET /api/dashboard/repair-trend - should return trend data', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/repair-trend?days=7')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/dashboard/fault-distribution - should return distribution', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/fault-distribution')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Returns { total, distribution: [...] }
      expect(res.body.distribution).toBeDefined();
      expect(typeof res.body.total).toBe('number');
    });
  });

  // ---------------------------------------------------------------------------
  // QR Code
  // ---------------------------------------------------------------------------
  describe('QRCode', () => {
    it('POST /api/qrcodes/:elevatorId - should generate QR code', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/qrcodes/${elevatorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body).toBeDefined();
    });

    it('GET /api/qrcodes - should list QR codes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/qrcodes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/qrcodes/:elevatorId - should get QR code for elevator', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/qrcodes/${elevatorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Notification
  // ---------------------------------------------------------------------------
  describe('Notification', () => {
    it('GET /api/notifications - should list notifications', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Response format: { items: [...], total, page, limit, totalPages }
      expect(res.body.items).toBeDefined();
      expect(typeof res.body.total).toBe('number');
    });

    it('GET /api/notifications/unread-count - should return count', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Response format: { unreadCount: number }
      expect(typeof res.body.unreadCount).toBe('number');
    });
  });

  // ---------------------------------------------------------------------------
  // Phase 2: Maintenance Unit
  // ---------------------------------------------------------------------------
  describe('MaintenanceUnit', () => {
    let unitId: string;
    let unitName: string;

    it('POST /api/maintenance-units - should create', async () => {
      unitName = `测试维保公司-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/maintenance-units')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: unitName, contactName: '张三', level: '一级' })
        .expect(201);

      expect(res.body.name).toBe(unitName);
      unitId = res.body.id;
    });

    it('GET /api/maintenance-units - should list with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/maintenance-units?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.list).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/maintenance-units/:id - should get detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/maintenance-units/${unitId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.name).toBe(unitName);
    });

    it('PUT /api/maintenance-units/:id - should update', async () => {
      await request(app.getHttpServer())
        .put(`/api/maintenance-units/${unitId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ contactName: '李四' })
        .expect(200);
    });

    it('DELETE /api/maintenance-units/:id - should delete', async () => {
      await request(app.getHttpServer())
        .delete(`/api/maintenance-units/${unitId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Phase 2: Monthly Fee
  // ---------------------------------------------------------------------------
  describe('MonthlyFee', () => {
    it('POST /api/monthly-fees/generate - should generate fees', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/monthly-fees/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(201);

      expect(typeof res.body.generated).toBe('number');
    });

    it('GET /api/monthly-fees - should list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/monthly-fees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.list).toBeDefined();
      expect(typeof res.body.total).toBe('number');
    });
  });

  // ---------------------------------------------------------------------------
  // Phase 2: Maintenance Plan
  // ---------------------------------------------------------------------------
  describe('MaintenancePlan', () => {
    it('GET /api/maintenance-plans - should list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/maintenance-plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.list).toBeDefined();
      expect(typeof res.body.total).toBe('number');
    });

    it('POST /api/maintenance-plans - should create', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/maintenance-plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          elevatorId,
          planDate: '2026-06-01',
          planType: 'MONTHLY',
          maintainerId: 'cmp8ceqps0000ma59dtjka465',
        })
        .expect(201);

      expect(res.body.planType).toBe('MONTHLY');
    });

    it('PUT /api/maintenance-plans/:id/status - should update status', async () => {
      const listRes: any = await request(app.getHttpServer())
        .get('/api/maintenance-plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const planId = listRes.body.list?.[0]?.id;
      if (planId) {
        await request(app.getHttpServer())
          .put(`/api/maintenance-plans/${planId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'IN_PROGRESS' })
          .expect(200);
      }
    });
  });
});
