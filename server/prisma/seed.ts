import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const hashedPwd = await bcrypt.hash('admin123', 10)
  const hashedUserPwd = await bcrypt.hash('123456', 10)

  // -----------------------------------------------------------------------
  // Organizations & Projects
  // -----------------------------------------------------------------------
  const org1 = await prisma.organization.upsert({
    where: { id: 'org-cmcc' },
    update: {},
    create: { id: 'org-cmcc', name: '中城物业集团', address: '上海市浦东新区世纪大道100号', phone: '021-58880000' },
  })
  const org2 = await prisma.organization.upsert({
    where: { id: 'org-wanke' },
    update: {},
    create: { id: 'org-wanke', name: '万科物业集团', address: '上海市闵行区七莘路1889号', phone: '021-64850000' },
  })

  const proj1 = await prisma.project.upsert({
    where: { id: 'proj-huating' },
    update: {},
    create: { id: 'proj-huating', name: '华庭小区', address: '上海市徐汇区华庭路100号', organizationId: org1.id },
  })
  const proj2 = await prisma.project.upsert({
    where: { id: 'proj-mingzhu' },
    update: {},
    create: { id: 'proj-mingzhu', name: '明珠花园', address: '上海市浦东新区明珠路200号', organizationId: org1.id },
  })
  const proj3 = await prisma.project.upsert({
    where: { id: 'proj-chenghuang' },
    update: {},
    create: { id: 'proj-chenghuang', name: '城隍商城', address: '上海市黄浦区城隍庙路50号', organizationId: org2.id },
  })

  // -----------------------------------------------------------------------
  // Buildings
  // -----------------------------------------------------------------------
  const buildings = [
    { id: 'bld-1a', name: '1栋A单元', projectId: proj1.id },
    { id: 'bld-1b', name: '1栋B单元', projectId: proj1.id },
    { id: 'bld-2a', name: '2栋A单元', projectId: proj1.id },
    { id: 'bld-2b', name: '2栋B单元', projectId: proj1.id },
    { id: 'bld-m1', name: '1号楼', projectId: proj2.id },
    { id: 'bld-m2', name: '2号楼', projectId: proj2.id },
    { id: 'bld-ca', name: 'A座', projectId: proj3.id },
    { id: 'bld-cb', name: 'B座', projectId: proj3.id },
  ]
  for (const b of buildings) {
    await prisma.building.upsert({ where: { id: b.id }, update: {}, create: b })
  }

  // -----------------------------------------------------------------------
  // Maintenance Units
  // -----------------------------------------------------------------------
  const mu1 = await prisma.maintenanceUnit.upsert({
    where: { id: 'mu-mitsubishi' },
    update: {},
    create: { id: 'mu-mitsubishi', name: '三菱电梯维保公司', contactName: '赵工', contactPhone: '13910001001', level: '一级', score: 92 },
  })
  const mu2 = await prisma.maintenanceUnit.upsert({
    where: { id: 'mu-otis' },
    update: {},
    create: { id: 'mu-otis', name: '奥的斯电梯维保公司', contactName: '钱工', contactPhone: '13910002002', level: '一级', score: 88 },
  })

  // -----------------------------------------------------------------------
  // Users
  // -----------------------------------------------------------------------
  const adminUser = await prisma.user.upsert({
    where: { phone: '13800000000' },
    update: { password: hashedPwd },
    create: { name: '系统管理员', phone: '13800000000', password: hashedPwd, role: 'ADMIN' },
  })
  const manager = await prisma.user.upsert({
    where: { phone: '13900000001' },
    update: { password: hashedUserPwd },
    create: { name: '张经理', phone: '13900000001', password: hashedUserPwd, role: 'ADMIN' },
  })
  const csWang = await prisma.user.upsert({
    where: { phone: '13900000002' },
    update: { password: hashedUserPwd },
    create: { name: '王客服', phone: '13900000002', password: hashedUserPwd, role: 'CUSTOMER_SERVICE' },
  })
  const engineerLi = await prisma.user.upsert({
    where: { phone: '13900000003' },
    update: { password: hashedUserPwd },
    create: { name: '李工程', phone: '13900000003', password: hashedUserPwd, role: 'ENGINEER' },
  })
  const maintainerZhao = await prisma.user.upsert({
    where: { phone: '13900000004' },
    update: { password: hashedUserPwd, maintenanceUnitId: mu1.id },
    create: { name: '赵维保', phone: '13900000004', password: hashedUserPwd, role: 'ELEVATOR_MAINTAINER', maintenanceUnitId: mu1.id },
  })
  const maintainerQian = await prisma.user.upsert({
    where: { phone: '13900000005' },
    update: { password: hashedUserPwd, maintenanceUnitId: mu2.id },
    create: { name: '钱维保', phone: '13900000005', password: hashedUserPwd, role: 'ELEVATOR_MAINTAINER', maintenanceUnitId: mu2.id },
  })
  const safetyOfficer = await prisma.user.upsert({
    where: { phone: '13900000006' },
    update: { password: hashedUserPwd },
    create: { name: '周安全', phone: '13900000006', password: hashedUserPwd, role: 'SAFETY_OFFICER' },
  })
  const supervisorWu = await prisma.user.upsert({
    where: { phone: '13900000007' },
    update: { password: hashedUserPwd },
    create: { name: '吴主管', phone: '13900000007', password: hashedUserPwd, role: 'PROJECT_SUPERVISOR' },
  })

  // Link users to projects
  const userProjects = [
    { userId: manager.id, projectId: proj1.id },
    { userId: manager.id, projectId: proj2.id },
    { userId: csWang.id, projectId: proj1.id },
    { userId: engineerLi.id, projectId: proj1.id },
    { userId: maintainerZhao.id, projectId: proj1.id },
    { userId: maintainerZhao.id, projectId: proj2.id },
    { userId: maintainerQian.id, projectId: proj3.id },
    { userId: safetyOfficer.id, projectId: proj1.id },
    { userId: supervisorWu.id, projectId: proj1.id },
  ]
  for (const up of userProjects) {
    await prisma.userProject.upsert({ where: { userId_projectId: up }, update: {}, create: up })
  }

  // Set supervisor relationships
  await prisma.user.update({ where: { id: supervisorWu.id }, data: { supervisorId: manager.id } })
  await prisma.user.update({ where: { id: maintainerZhao.id }, data: { supervisorId: supervisorWu.id } })

  // -----------------------------------------------------------------------
  // Elevators
  // -----------------------------------------------------------------------
  const elevators = [
    { id: 'elev-a1', regCode: 'SH2026-001', projectId: proj1.id, building: '1栋A单元', brand: '三菱', model: 'ELENESSA', floorCount: 18, capacity: 1000, speed: 1.75, status: 'RUNNING' as const, installDate: new Date('2020-03-15'), lastInspectDate: new Date('2025-06-01'), nextInspectDate: new Date('2026-06-01'), customerServiceId: csWang.id, maintainerId: maintainerZhao.id, safetyOfficerId: safetyOfficer.id },
    { id: 'elev-a2', regCode: 'SH2026-002', projectId: proj1.id, building: '1栋B单元', brand: '三菱', model: 'ELENESSA', floorCount: 18, capacity: 1000, speed: 1.75, status: 'RUNNING' as const, installDate: new Date('2020-03-15'), lastInspectDate: new Date('2025-06-01'), nextInspectDate: new Date('2026-06-01'), customerServiceId: csWang.id, maintainerId: maintainerZhao.id, safetyOfficerId: safetyOfficer.id },
    { id: 'elev-a3', regCode: 'SH2026-003', projectId: proj1.id, building: '2栋A单元', brand: '三菱', model: 'NEXIEZ', floorCount: 12, capacity: 800, speed: 1.5, status: 'MAINTENANCE' as const, installDate: new Date('2021-07-20'), lastInspectDate: new Date('2025-09-01'), nextInspectDate: new Date('2026-09-01'), customerServiceId: csWang.id, maintainerId: maintainerZhao.id, safetyOfficerId: safetyOfficer.id },
    { id: 'elev-a4', regCode: 'SH2026-004', projectId: proj1.id, building: '2栋B单元', brand: '三菱', model: 'NEXIEZ', floorCount: 12, capacity: 800, speed: 1.5, status: 'FAULT' as const, installDate: new Date('2021-07-20'), lastInspectDate: new Date('2025-09-01'), nextInspectDate: new Date('2026-09-01'), customerServiceId: csWang.id, maintainerId: maintainerZhao.id, safetyOfficerId: safetyOfficer.id },
    { id: 'elev-a5', regCode: 'SH2026-005', projectId: proj1.id, building: '3栋', brand: '日立', model: 'CA-29', floorCount: 24, capacity: 1350, speed: 2.5, status: 'RUNNING' as const, installDate: new Date('2022-01-10'), lastInspectDate: new Date('2025-11-01'), nextInspectDate: new Date('2026-11-01'), customerServiceId: csWang.id, maintainerId: maintainerZhao.id, safetyOfficerId: safetyOfficer.id },
    { id: 'elev-b1', regCode: 'SH2026-006', projectId: proj2.id, building: '1号楼', brand: '通力', model: 'MonoSpace', floorCount: 15, capacity: 1000, speed: 1.75, status: 'RUNNING' as const, installDate: new Date('2019-11-20'), lastInspectDate: new Date('2025-04-01'), nextInspectDate: new Date('2026-04-10'), customerServiceId: csWang.id, maintainerId: maintainerZhao.id },
    { id: 'elev-b2', regCode: 'SH2026-007', projectId: proj2.id, building: '2号楼', brand: '通力', model: 'MonoSpace', floorCount: 15, capacity: 1000, speed: 1.75, status: 'STOPPED' as const, installDate: new Date('2019-11-20'), lastInspectDate: new Date('2024-04-01'), nextInspectDate: new Date('2025-04-01'), customerServiceId: csWang.id, maintainerId: maintainerZhao.id },
    { id: 'elev-c1', regCode: 'SH2026-008', projectId: proj3.id, building: 'A座', brand: '奥的斯', model: 'Gen2', floorCount: 30, capacity: 1600, speed: 3.0, status: 'RUNNING' as const, installDate: new Date('2018-05-01'), lastInspectDate: new Date('2025-12-01'), nextInspectDate: new Date('2026-12-01'), customerServiceId: csWang.id, maintainerId: maintainerQian.id },
    { id: 'elev-c2', regCode: 'SH2026-009', projectId: proj3.id, building: 'B座', brand: '奥的斯', model: 'Gen2', floorCount: 30, capacity: 1600, speed: 3.0, status: 'RUNNING' as const, installDate: new Date('2018-05-01'), lastInspectDate: new Date('2025-12-01'), nextInspectDate: new Date('2026-12-01'), customerServiceId: csWang.id, maintainerId: maintainerQian.id },
    { id: 'elev-c3', regCode: 'SH2026-010', projectId: proj3.id, building: 'B座(货梯)', brand: '奥的斯', model: 'Gen2', floorCount: 30, capacity: 2000, speed: 1.0, status: 'RUNNING' as const, installDate: new Date('2019-03-01'), lastInspectDate: new Date('2025-08-01'), nextInspectDate: new Date('2026-08-01'), customerServiceId: csWang.id, maintainerId: maintainerQian.id },
  ]
  for (const e of elevators) {
    await prisma.elevator.upsert({ where: { id: e.id }, update: {}, create: e })
  }

  // -----------------------------------------------------------------------
  // Contracts
  // -----------------------------------------------------------------------
  const contract1 = await prisma.contract.upsert({
    where: { id: 'ct-mitsubishi' },
    update: {},
    create: {
      id: 'ct-mitsubishi', contractNo: 'HT-2026-001', name: '华庭小区/明珠花园三菱电梯维保合同',
      maintenanceUnitId: mu1.id, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
      monthlyPrice: 500, totalPrice: 42000, paymentCycle: 'monthly', status: 'ACTIVE',
      signatory: '三菱电梯维保公司', contactPerson: '赵工', contactPhone: '13910001001',
    },
  })
  const contract2 = await prisma.contract.upsert({
    where: { id: 'ct-otis' },
    update: {},
    create: {
      id: 'ct-otis', contractNo: 'HT-2026-002', name: '城隍商城奥的斯电梯维保合同',
      maintenanceUnitId: mu2.id, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
      monthlyPrice: 600, totalPrice: 21600, paymentCycle: 'monthly', status: 'ACTIVE',
      signatory: '奥的斯电梯维保公司', contactPerson: '钱工', contactPhone: '13910002002',
    },
  })

  // Link elevators to contracts
  const ct1Elevators = ['elev-a1', 'elev-a2', 'elev-a3', 'elev-a4', 'elev-a5', 'elev-b1', 'elev-b2']
  for (const eid of ct1Elevators) {
    await prisma.contractElevator.upsert({
      where: { contractId_elevatorId: { contractId: contract1.id, elevatorId: eid } },
      update: {}, create: { contractId: contract1.id, elevatorId: eid },
    })
  }
  const ct2Elevators = ['elev-c1', 'elev-c2', 'elev-c3']
  for (const eid of ct2Elevators) {
    await prisma.contractElevator.upsert({
      where: { contractId_elevatorId: { contractId: contract2.id, elevatorId: eid } },
      update: {}, create: { contractId: contract2.id, elevatorId: eid },
    })
  }

  // Contract parts
  const partsData = [
    { contractId: contract1.id, type: 'FREE' as const, name: '门锁装置', model: 'ML-001', unit: '个', quantity: 10, price: 0 },
    { contractId: contract1.id, type: 'FREE' as const, name: '按钮开关', model: 'AN-02', unit: '个', quantity: 20, price: 0 },
    { contractId: contract1.id, type: 'FREE' as const, name: '照明灯管', unit: '根', quantity: 30, price: 0 },
    { contractId: contract1.id, type: 'CHARGE' as const, name: '曳引钢丝绳', model: '8x19S-10mm', unit: '米', quantity: 200, price: 28 },
    { contractId: contract1.id, type: 'CHARGE' as const, name: '主板PCB', model: 'KCD-116A', unit: '块', quantity: 3, price: 2800 },
    { contractId: contract2.id, type: 'FREE' as const, name: '门滑块', unit: '个', quantity: 50, price: 0 },
    { contractId: contract2.id, type: 'FREE' as const, name: '导靴衬板', unit: '个', quantity: 20, price: 0 },
    { contractId: contract2.id, type: 'CHARGE' as const, name: '变频器', model: 'VF-3000', unit: '台', quantity: 2, price: 6500 },
  ]
  await prisma.contractPart.createMany({ data: partsData, skipDuplicates: true })

  // -----------------------------------------------------------------------
  // Contract Evaluations
  // -----------------------------------------------------------------------
  await prisma.contractEvaluation.createMany({
    data: [
      { contractId: contract1.id, month: new Date('2026-01-01'), score: 95, content: '1月考核: 响应及时，维保质量好', evaluator: '张经理' },
      { contractId: contract1.id, month: new Date('2026-02-01'), score: 90, content: '2月考核: 良好', evaluator: '张经理' },
      { contractId: contract2.id, month: new Date('2026-01-01'), score: 88, content: '1月考核: 良好', evaluator: '张经理' },
    ],
    skipDuplicates: true,
  })

  // -----------------------------------------------------------------------
  // Sample Repair Orders (use upsert so re-seeding is safe)
  // -----------------------------------------------------------------------
  const repair1 = await prisma.repairOrder.upsert({
    where: { orderNo: 'BX202605150001' },
    update: {},
    create: {
      orderNo: 'BX202605150001', elevatorId: 'elev-a4', reporterId: csWang.id,
      assigneeId: maintainerZhao.id, status: 'PENDING_REPAIR',
      stopType: '停梯', urgency: 'EMERGENCY',
      description: '电梯运行异响，伴有抖动，2栋B单元业主投诉',
    },
  })
  await prisma.repairPart.create({
    data: { repairId: repair1.id, partName: '导靴衬板', quantity: 4, price: 0, costType: 'FREE', remark: '磨损更换' },
  })

  const repair2 = await prisma.repairOrder.upsert({
    where: { orderNo: 'BX202605140001' },
    update: {},
    create: {
      orderNo: 'BX202605140001', elevatorId: 'elev-a2', reporterId: csWang.id,
      assigneeId: maintainerZhao.id, status: 'APPROVED',
      stopType: '未停梯', urgency: 'NORMAL',
      description: '1栋B单元电梯按键失灵，部分楼层无法呼叫',
    },
  })
  await prisma.repairPart.create({
    data: { repairId: repair2.id, partName: '按钮开关', partModel: 'AN-02', quantity: 5, price: 0, costType: 'FREE' },
  })

  const repair3 = await prisma.repairOrder.upsert({
    where: { orderNo: 'BX202605100001' },
    update: {},
    create: {
      orderNo: 'BX202605100001', elevatorId: 'elev-b1', reporterId: csWang.id,
      assigneeId: maintainerZhao.id, status: 'RESOLVED', completedAt: new Date('2026-05-12'),
      stopType: '停梯', urgency: 'NORMAL',
      description: '明珠花园1号楼电梯门无法正常关闭',
    },
  })
  await prisma.repairPart.create({
    data: { repairId: repair3.id, partName: '门锁装置', partModel: 'ML-001', quantity: 1, price: 0, costType: 'FREE' },
  })
  await prisma.repairCost.create({
    data: { repairId: repair3.id, costType: 'CONTRACT_IN', amount: 500, description: '门锁维修费' },
  })

  const repair4 = await prisma.repairOrder.upsert({
    where: { orderNo: 'BX202605080001' },
    update: {},
    create: {
      orderNo: 'BX202605080001', elevatorId: 'elev-c1', reporterId: csWang.id,
      status: 'PENDING_ACCEPT', stopType: '停梯', urgency: 'EMERGENCY',
      description: 'A座客梯困人，1人被困5分钟已救出，需检查电梯状态',
    },
  })
  await prisma.faultRecord.create({
    data: { elevatorId: 'elev-c1', faultType: 'TRAPPED', description: '困人(5分钟)', isTrapped: true, trappedCount: 1, downtime: 30 },
  })

  // -----------------------------------------------------------------------
  // Workflows for repair orders (upsert on repairOrderId to handle re-seed)
  // -----------------------------------------------------------------------
  const wf1 = await prisma.workflowInstance.upsert({
    where: { repairOrderId: repair1.id },
    update: {},
    create: { workflowType: 'REPAIR', repairOrderId: repair1.id, currentStep: 'PENDING_REPAIR', status: 'ACTIVE' },
  })
  await prisma.workflowNode.createMany({
    data: [
      { instanceId: wf1.id, stepName: 'PENDING_ACCEPT', action: 'SUBMIT', comment: '报修单创建' },
      { instanceId: wf1.id, stepName: 'PENDING_REPAIR', action: 'APPROVE', approverId: maintainerZhao.id, comment: '维保员接单' },
    ],
  })

  const wf2 = await prisma.workflowInstance.upsert({
    where: { repairOrderId: repair2.id },
    update: {},
    create: { workflowType: 'REPAIR', repairOrderId: repair2.id, currentStep: 'APPROVED', status: 'ACTIVE' },
  })
  await prisma.workflowNode.createMany({
    data: [
      { instanceId: wf2.id, stepName: 'PENDING_ACCEPT', action: 'SUBMIT', comment: '报修单创建' },
      { instanceId: wf2.id, stepName: 'PENDING_REPAIR', action: 'APPROVE', approverId: maintainerZhao.id, comment: '已维修' },
      { instanceId: wf2.id, stepName: 'PENDING_SUPERVISOR', action: 'APPROVE', approverId: supervisorWu.id, comment: '主管审批通过' },
      { instanceId: wf2.id, stepName: 'PENDING_MANAGER', action: 'APPROVE', approverId: manager.id, comment: '经理批准' },
    ],
  })

  const wf3 = await prisma.workflowInstance.upsert({
    where: { repairOrderId: repair3.id },
    update: {},
    create: { workflowType: 'REPAIR', repairOrderId: repair3.id, currentStep: 'RESOLVED', status: 'COMPLETED' },
  })
  await prisma.workflowNode.createMany({
    data: [
      { instanceId: wf3.id, stepName: 'PENDING_ACCEPT', action: 'SUBMIT', comment: '报修单创建' },
      { instanceId: wf3.id, stepName: 'PENDING_REPAIR', action: 'APPROVE', approverId: maintainerZhao.id, comment: '维修完成' },
      { instanceId: wf3.id, stepName: 'PENDING_SUPERVISOR', action: 'APPROVE', approverId: supervisorWu.id, comment: '主管确认' },
      { instanceId: wf3.id, stepName: 'PENDING_MANAGER', action: 'APPROVE', approverId: manager.id, comment: '经理批准' },
    ],
  })

  // -----------------------------------------------------------------------
  // Fault Records
  // -----------------------------------------------------------------------
  await prisma.faultRecord.createMany({
    data: [
      { elevatorId: 'elev-a4', faultType: 'TRACTION_FAULT', description: '运行异响、抖动', isTrapped: false, downtime: 240 },
      { elevatorId: 'elev-a2', faultType: 'CONTROL_FAULT', description: '按键失灵', isTrapped: false, downtime: 0 },
      { elevatorId: 'elev-b1', faultType: 'DOOR_FAULT', description: '门无法关闭', isTrapped: false, downtime: 120 },
    ],
    skipDuplicates: true,
  })

  // -----------------------------------------------------------------------
  // Maintenance Plans (next 6 months)
  // -----------------------------------------------------------------------
  const planData: Array<{ elevatorId: string; planDate: Date; planType: string; maintainerIds: string[] }> = []
  const now = new Date()
  const allElevatorIds = elevators.map((e) => ({ id: e.id, maintainerId: e.maintainerId! }))
  for (let m = 0; m < 6; m++) {
    // Half-monthly plans for the 1st and 15th
    for (let day of [1, 15]) {
      const d = new Date(now.getFullYear(), now.getMonth() + m, day)
      if (d > new Date(now.getFullYear(), now.getMonth() + m + 1, 0)) continue
      for (const e of allElevatorIds) {
        planData.push({ elevatorId: e.id, planDate: d, planType: 'HALF_MONTHLY', maintainerIds: [e.maintainerId] })
      }
    }
  }
  // Only create first 20 plans to avoid overwhelming seed
  await prisma.maintenancePlan.createMany({ data: planData.slice(0, 20), skipDuplicates: true })

  // -----------------------------------------------------------------------
  // QR Codes
  // -----------------------------------------------------------------------
  for (const e of elevators) {
    await prisma.qRCode.upsert({
      where: { elevatorId: e.id },
      update: {},
      create: { elevatorId: e.id, code: `QR-${e.regCode}` },
    })
  }

  // -----------------------------------------------------------------------
  // Monthly Fees (for the current month)
  // -----------------------------------------------------------------------
  const currentYM = new Date(now.getFullYear(), now.getMonth(), 1)
  for (const mu of [mu1, mu2]) {
    const contractsForMU = mu.id === mu1.id ? [contract1] : [contract2]
    let elevatorCount = 0
    let unitPrice = 0
    for (const ct of contractsForMU) {
      const ctElevs = ct.id === contract1.id ? ct1Elevators : ct2Elevators
      elevatorCount += ctElevs.length
      unitPrice = Number(ct.monthlyPrice)
    }
    const totalAmount = elevatorCount * unitPrice
    await prisma.monthlyFee.upsert({
      where: { maintenanceUnitId_yearMonth: { maintenanceUnitId: mu.id, yearMonth: currentYM } },
      update: {},
      create: {
        maintenanceUnitId: mu.id, projectId: proj1.id, yearMonth: currentYM,
        elevatorCount, unitPrice, totalAmount, status: 'PENDING',
      },
    })
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log(`
✅ Seed completed successfully!

📋 Data Summary:
  Organizations:    2
  Projects:         3
  Buildings:        8
  Users:            8 (${adminUser.name}(admin), ${manager.name}, ${csWang.name}, etc.)
  Elevators:        ${elevators.length}
  Contracts:        2
  Contract Parts:   8
  Repair Orders:    4 (various statuses)
  Workflows:        3
  Maintenance Plans: ${planData.slice(0, 20).length}
  QR Codes:         ${elevators.length}
  Monthly Fees:     2

👤 Test Accounts:
  Admin:    13800000000 / admin123
  Manager:  13900000001 / 123456  (张经理)
  Maintainer: 13900000004 / 123456 (赵维保)
  CustomerSvc: 13900000002 / 123456 (王客服)
  `)
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
