--
-- PostgreSQL database dump
--

\restrict BZKuWzqP92fbvny9t0nuF7s0LA0zQaNu3GrTDZYpuQgNkgzcwncG4cziUQ1uaiE

-- Dumped from database version 18.4 (Homebrew)
-- Dumped by pg_dump version 18.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ContractStatus; Type: TYPE; Schema: public; Owner: elevator
--

CREATE TYPE public."ContractStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'EXPIRED',
    'TERMINATED'
);


ALTER TYPE public."ContractStatus" OWNER TO elevator;

--
-- Name: CostType; Type: TYPE; Schema: public; Owner: elevator
--

CREATE TYPE public."CostType" AS ENUM (
    'FREE',
    'CONTRACT_IN',
    'CONTRACT_OUT',
    'PUBLIC_FUND'
);


ALTER TYPE public."CostType" OWNER TO elevator;

--
-- Name: ElevatorStatus; Type: TYPE; Schema: public; Owner: elevator
--

CREATE TYPE public."ElevatorStatus" AS ENUM (
    'RUNNING',
    'STOPPED',
    'MAINTENANCE',
    'FAULT'
);


ALTER TYPE public."ElevatorStatus" OWNER TO elevator;

--
-- Name: FaultType; Type: TYPE; Schema: public; Owner: elevator
--

CREATE TYPE public."FaultType" AS ENUM (
    'DOOR_FAULT',
    'TRACTION_FAULT',
    'CONTROL_FAULT',
    'SAFETY_FAULT',
    'TRAPPED',
    'OTHER'
);


ALTER TYPE public."FaultType" OWNER TO elevator;

--
-- Name: InspectionType; Type: TYPE; Schema: public; Owner: elevator
--

CREATE TYPE public."InspectionType" AS ENUM (
    'PATROL',
    'MAINTAIN_BEFORE',
    'MAINTAIN_DURING',
    'MAINTAIN_AFTER'
);


ALTER TYPE public."InspectionType" OWNER TO elevator;

--
-- Name: PartType; Type: TYPE; Schema: public; Owner: elevator
--

CREATE TYPE public."PartType" AS ENUM (
    'CHARGE',
    'FREE'
);


ALTER TYPE public."PartType" OWNER TO elevator;

--
-- Name: RepairStatus; Type: TYPE; Schema: public; Owner: elevator
--

CREATE TYPE public."RepairStatus" AS ENUM (
    'PENDING_ACCEPT',
    'PENDING_REPAIR',
    'PENDING_PARTS_VERIFY',
    'PENDING_SUPERVISOR',
    'PENDING_MANAGER',
    'PENDING_FUND_REVIEW',
    'APPROVED',
    'RESOLVED',
    'CLOSED',
    'REJECTED'
);


ALTER TYPE public."RepairStatus" OWNER TO elevator;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: elevator
--

CREATE TYPE public."Role" AS ENUM (
    'PROJECT_MANAGER',
    'PROJECT_SUPERVISOR',
    'CUSTOMER_SERVICE',
    'ENGINEER',
    'SECURITY',
    'ELEVATOR_MAINTAINER',
    'SAFETY_OFFICER',
    'SAFETY_DIRECTOR',
    'ADMIN'
);


ALTER TYPE public."Role" OWNER TO elevator;

--
-- Name: Urgency; Type: TYPE; Schema: public; Owner: elevator
--

CREATE TYPE public."Urgency" AS ENUM (
    'EMERGENCY',
    'NORMAL',
    'LOW'
);


ALTER TYPE public."Urgency" OWNER TO elevator;

--
-- Name: WorkflowStatus; Type: TYPE; Schema: public; Owner: elevator
--

CREATE TYPE public."WorkflowStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'REJECTED'
);


ALTER TYPE public."WorkflowStatus" OWNER TO elevator;

--
-- Name: WorkflowType; Type: TYPE; Schema: public; Owner: elevator
--

CREATE TYPE public."WorkflowType" AS ENUM (
    'REPAIR',
    'FUND_REPAIR'
);


ALTER TYPE public."WorkflowType" OWNER TO elevator;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Building; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."Building" (
    id text NOT NULL,
    name text NOT NULL,
    "projectId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Building" OWNER TO elevator;

--
-- Name: Contract; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."Contract" (
    id text NOT NULL,
    "contractNo" text NOT NULL,
    name text NOT NULL,
    "maintenanceUnitId" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "monthlyPrice" numeric(65,30) DEFAULT 0 NOT NULL,
    "totalPrice" numeric(65,30) DEFAULT 0 NOT NULL,
    "paymentCycle" text DEFAULT 'monthly'::text NOT NULL,
    "evaluationStd" text,
    status public."ContractStatus" DEFAULT 'ACTIVE'::public."ContractStatus" NOT NULL,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Contract" OWNER TO elevator;

--
-- Name: ContractElevator; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."ContractElevator" (
    "contractId" text NOT NULL,
    "elevatorId" text NOT NULL,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ContractElevator" OWNER TO elevator;

--
-- Name: ContractEvaluation; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."ContractEvaluation" (
    id text NOT NULL,
    "contractId" text NOT NULL,
    month timestamp(3) without time zone NOT NULL,
    score integer NOT NULL,
    content text,
    evaluator text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ContractEvaluation" OWNER TO elevator;

--
-- Name: ContractPart; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."ContractPart" (
    id text NOT NULL,
    "contractId" text NOT NULL,
    type public."PartType" NOT NULL,
    name text NOT NULL,
    model text,
    unit text NOT NULL,
    price numeric(65,30),
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ContractPart" OWNER TO elevator;

--
-- Name: Elevator; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."Elevator" (
    id text NOT NULL,
    "regCode" text NOT NULL,
    "assetNo" text,
    brand text,
    model text,
    "floorCount" integer,
    capacity integer,
    speed double precision,
    "installDate" timestamp(3) without time zone,
    "lastInspectDate" timestamp(3) without time zone,
    "nextInspectDate" timestamp(3) without time zone,
    "manufactureNo" text,
    status public."ElevatorStatus" DEFAULT 'RUNNING'::public."ElevatorStatus" NOT NULL,
    "locationDesc" text,
    latitude double precision,
    longitude double precision,
    "projectId" text NOT NULL,
    building text,
    "customerServiceId" text,
    "safetyOfficerId" text,
    "safetyDirectorId" text,
    "maintainerId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Elevator" OWNER TO elevator;

--
-- Name: FaultRecord; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."FaultRecord" (
    id text NOT NULL,
    "elevatorId" text NOT NULL,
    "faultType" public."FaultType" DEFAULT 'OTHER'::public."FaultType" NOT NULL,
    description text NOT NULL,
    "isTrapped" boolean DEFAULT false NOT NULL,
    "trappedCount" integer,
    downtime integer,
    "repairOrderId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."FaultRecord" OWNER TO elevator;

--
-- Name: FundMaterial; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."FundMaterial" (
    id text NOT NULL,
    "instanceId" text NOT NULL,
    "materialType" text NOT NULL,
    title text NOT NULL,
    "filePath" text,
    content text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."FundMaterial" OWNER TO elevator;

--
-- Name: InspectionPhoto; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."InspectionPhoto" (
    id text NOT NULL,
    "taskId" text NOT NULL,
    "filePath" text NOT NULL,
    "watermarkPath" text,
    "fileSize" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."InspectionPhoto" OWNER TO elevator;

--
-- Name: InspectionTask; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."InspectionTask" (
    id text NOT NULL,
    "elevatorId" text NOT NULL,
    "inspectorId" text NOT NULL,
    type public."InspectionType" DEFAULT 'PATROL'::public."InspectionType" NOT NULL,
    location text,
    latitude double precision,
    longitude double precision,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."InspectionTask" OWNER TO elevator;

--
-- Name: MaintenancePlan; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."MaintenancePlan" (
    id text NOT NULL,
    "elevatorId" text NOT NULL,
    "planDate" timestamp(3) without time zone NOT NULL,
    "planType" text NOT NULL,
    "maintainerIds" text[] NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MaintenancePlan" OWNER TO elevator;

--
-- Name: MaintenanceUnit; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."MaintenanceUnit" (
    id text NOT NULL,
    name text NOT NULL,
    "contactName" text,
    "contactPhone" text,
    address text,
    level text,
    score double precision,
    "scoreLevel" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MaintenanceUnit" OWNER TO elevator;

--
-- Name: MonthlyFee; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."MonthlyFee" (
    id text NOT NULL,
    "maintenanceUnitId" text NOT NULL,
    "projectId" text NOT NULL,
    "yearMonth" timestamp(3) without time zone NOT NULL,
    "elevatorCount" integer NOT NULL,
    "unitPrice" numeric(65,30) NOT NULL,
    "totalAmount" numeric(65,30) NOT NULL,
    "repairCostTotal" numeric(65,30) DEFAULT 0 NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MonthlyFee" OWNER TO elevator;

--
-- Name: MonthlyFeeItem; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."MonthlyFeeItem" (
    id text NOT NULL,
    "monthlyFeeId" text NOT NULL,
    "elevatorId" text NOT NULL,
    "costType" public."CostType" NOT NULL,
    amount numeric(65,30) NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MonthlyFeeItem" OWNER TO elevator;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    title text NOT NULL,
    content text,
    type text NOT NULL,
    "refId" text,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO elevator;

--
-- Name: Organization; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."Organization" (
    id text NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Organization" OWNER TO elevator;

--
-- Name: Project; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    name text NOT NULL,
    address text,
    "contactName" text,
    "contactPhone" text,
    "organizationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Project" OWNER TO elevator;

--
-- Name: QRCode; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."QRCode" (
    id text NOT NULL,
    "elevatorId" text NOT NULL,
    code text NOT NULL,
    "qrImagePath" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."QRCode" OWNER TO elevator;

--
-- Name: RepairCost; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."RepairCost" (
    id text NOT NULL,
    "repairId" text NOT NULL,
    "costType" public."CostType" NOT NULL,
    amount numeric(65,30) NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RepairCost" OWNER TO elevator;

--
-- Name: RepairMedia; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."RepairMedia" (
    id text NOT NULL,
    "repairId" text NOT NULL,
    "fileType" text NOT NULL,
    "filePath" text NOT NULL,
    thumbnail text,
    watermark text,
    "fileSize" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RepairMedia" OWNER TO elevator;

--
-- Name: RepairOrder; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."RepairOrder" (
    id text NOT NULL,
    "orderNo" text NOT NULL,
    "elevatorId" text NOT NULL,
    "reporterId" text NOT NULL,
    "assigneeId" text,
    status public."RepairStatus" DEFAULT 'PENDING_ACCEPT'::public."RepairStatus" NOT NULL,
    "stopType" text,
    urgency public."Urgency" DEFAULT 'NORMAL'::public."Urgency" NOT NULL,
    description text NOT NULL,
    "isPartsNeeded" boolean,
    "resolveNote" text,
    "acceptedAt" timestamp(3) without time zone,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RepairOrder" OWNER TO elevator;

--
-- Name: RepairPart; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."RepairPart" (
    id text NOT NULL,
    "repairId" text NOT NULL,
    "partName" text NOT NULL,
    "partModel" text,
    quantity integer DEFAULT 1 NOT NULL,
    price numeric(65,30) DEFAULT 0 NOT NULL,
    "costType" public."CostType" DEFAULT 'CONTRACT_IN'::public."CostType" NOT NULL,
    remark text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RepairPart" OWNER TO elevator;

--
-- Name: SystemConfig; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."SystemConfig" (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL
);


ALTER TABLE public."SystemConfig" OWNER TO elevator;

--
-- Name: User; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    password text NOT NULL,
    avatar text,
    "wxOpenId" text,
    role public."Role" DEFAULT 'ADMIN'::public."Role" NOT NULL,
    title text,
    email text,
    "isActive" boolean DEFAULT true NOT NULL,
    "supervisorId" text,
    "maintenanceUnitId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO elevator;

--
-- Name: UserProject; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."UserProject" (
    "userId" text NOT NULL,
    "projectId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."UserProject" OWNER TO elevator;

--
-- Name: WorkflowInstance; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."WorkflowInstance" (
    id text NOT NULL,
    "workflowType" public."WorkflowType" NOT NULL,
    "repairOrderId" text NOT NULL,
    "currentStep" text NOT NULL,
    status public."WorkflowStatus" DEFAULT 'ACTIVE'::public."WorkflowStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."WorkflowInstance" OWNER TO elevator;

--
-- Name: WorkflowNode; Type: TABLE; Schema: public; Owner: elevator
--

CREATE TABLE public."WorkflowNode" (
    id text NOT NULL,
    "instanceId" text NOT NULL,
    "stepName" text NOT NULL,
    "approverId" text,
    action text,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."WorkflowNode" OWNER TO elevator;

--
-- Data for Name: Building; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."Building" (id, name, "projectId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Contract; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."Contract" (id, "contractNo", name, "maintenanceUnitId", "startDate", "endDate", "monthlyPrice", "totalPrice", "paymentCycle", "evaluationStd", status, remark, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ContractElevator; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."ContractElevator" ("contractId", "elevatorId", "startDate") FROM stdin;
\.


--
-- Data for Name: ContractEvaluation; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."ContractEvaluation" (id, "contractId", month, score, content, evaluator, "createdAt") FROM stdin;
\.


--
-- Data for Name: ContractPart; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."ContractPart" (id, "contractId", type, name, model, unit, price, remark, "createdAt") FROM stdin;
\.


--
-- Data for Name: Elevator; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."Elevator" (id, "regCode", "assetNo", brand, model, "floorCount", capacity, speed, "installDate", "lastInspectDate", "nextInspectDate", "manufactureNo", status, "locationDesc", latitude, longitude, "projectId", building, "customerServiceId", "safetyOfficerId", "safetyDirectorId", "maintainerId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FaultRecord; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."FaultRecord" (id, "elevatorId", "faultType", description, "isTrapped", "trappedCount", downtime, "repairOrderId", "createdAt") FROM stdin;
\.


--
-- Data for Name: FundMaterial; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."FundMaterial" (id, "instanceId", "materialType", title, "filePath", content, status, "createdAt") FROM stdin;
\.


--
-- Data for Name: InspectionPhoto; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."InspectionPhoto" (id, "taskId", "filePath", "watermarkPath", "fileSize", "createdAt") FROM stdin;
\.


--
-- Data for Name: InspectionTask; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."InspectionTask" (id, "elevatorId", "inspectorId", type, location, latitude, longitude, note, "createdAt") FROM stdin;
\.


--
-- Data for Name: MaintenancePlan; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."MaintenancePlan" (id, "elevatorId", "planDate", "planType", "maintainerIds", status, "startedAt", "completedAt", remark, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MaintenanceUnit; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."MaintenanceUnit" (id, name, "contactName", "contactPhone", address, level, score, "scoreLevel", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MonthlyFee; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."MonthlyFee" (id, "maintenanceUnitId", "projectId", "yearMonth", "elevatorCount", "unitPrice", "totalAmount", "repairCostTotal", status, remark, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MonthlyFeeItem; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."MonthlyFeeItem" (id, "monthlyFeeId", "elevatorId", "costType", amount, description, "createdAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."Notification" (id, "userId", title, content, type, "refId", "isRead", "createdAt") FROM stdin;
\.


--
-- Data for Name: Organization; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."Organization" (id, name, address, phone, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."Project" (id, name, address, "contactName", "contactPhone", "organizationId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: QRCode; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."QRCode" (id, "elevatorId", code, "qrImagePath", "createdAt") FROM stdin;
\.


--
-- Data for Name: RepairCost; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."RepairCost" (id, "repairId", "costType", amount, description, "createdAt") FROM stdin;
\.


--
-- Data for Name: RepairMedia; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."RepairMedia" (id, "repairId", "fileType", "filePath", thumbnail, watermark, "fileSize", "createdAt") FROM stdin;
\.


--
-- Data for Name: RepairOrder; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."RepairOrder" (id, "orderNo", "elevatorId", "reporterId", "assigneeId", status, "stopType", urgency, description, "isPartsNeeded", "resolveNote", "acceptedAt", "startedAt", "completedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RepairPart; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."RepairPart" (id, "repairId", "partName", "partModel", quantity, price, "costType", remark, "createdAt") FROM stdin;
\.


--
-- Data for Name: SystemConfig; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."SystemConfig" (id, key, value) FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."User" (id, name, phone, password, avatar, "wxOpenId", role, title, email, "isActive", "supervisorId", "maintenanceUnitId", "createdAt", "updatedAt") FROM stdin;
user-admin	系统管理员	13800000000	$2b$10$slU/NpM8IFbH6sJQJ5wCK.DixCNRjijo750PJOUzry3YGAUiBCL5a	\N	\N	ADMIN	\N	\N	t	\N	\N	2026-05-21 13:27:47.807	2026-05-21 13:27:47.807
\.


--
-- Data for Name: UserProject; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."UserProject" ("userId", "projectId", "createdAt") FROM stdin;
\.


--
-- Data for Name: WorkflowInstance; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."WorkflowInstance" (id, "workflowType", "repairOrderId", "currentStep", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: WorkflowNode; Type: TABLE DATA; Schema: public; Owner: elevator
--

COPY public."WorkflowNode" (id, "instanceId", "stepName", "approverId", action, comment, "createdAt") FROM stdin;
\.


--
-- Name: Building Building_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."Building"
    ADD CONSTRAINT "Building_pkey" PRIMARY KEY (id);


--
-- Name: ContractElevator ContractElevator_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."ContractElevator"
    ADD CONSTRAINT "ContractElevator_pkey" PRIMARY KEY ("contractId", "elevatorId");


--
-- Name: ContractEvaluation ContractEvaluation_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."ContractEvaluation"
    ADD CONSTRAINT "ContractEvaluation_pkey" PRIMARY KEY (id);


--
-- Name: ContractPart ContractPart_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."ContractPart"
    ADD CONSTRAINT "ContractPart_pkey" PRIMARY KEY (id);


--
-- Name: Contract Contract_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_pkey" PRIMARY KEY (id);


--
-- Name: Elevator Elevator_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."Elevator"
    ADD CONSTRAINT "Elevator_pkey" PRIMARY KEY (id);


--
-- Name: FaultRecord FaultRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."FaultRecord"
    ADD CONSTRAINT "FaultRecord_pkey" PRIMARY KEY (id);


--
-- Name: FundMaterial FundMaterial_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."FundMaterial"
    ADD CONSTRAINT "FundMaterial_pkey" PRIMARY KEY (id);


--
-- Name: InspectionPhoto InspectionPhoto_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."InspectionPhoto"
    ADD CONSTRAINT "InspectionPhoto_pkey" PRIMARY KEY (id);


--
-- Name: InspectionTask InspectionTask_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."InspectionTask"
    ADD CONSTRAINT "InspectionTask_pkey" PRIMARY KEY (id);


--
-- Name: MaintenancePlan MaintenancePlan_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."MaintenancePlan"
    ADD CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY (id);


--
-- Name: MaintenanceUnit MaintenanceUnit_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."MaintenanceUnit"
    ADD CONSTRAINT "MaintenanceUnit_pkey" PRIMARY KEY (id);


--
-- Name: MonthlyFeeItem MonthlyFeeItem_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."MonthlyFeeItem"
    ADD CONSTRAINT "MonthlyFeeItem_pkey" PRIMARY KEY (id);


--
-- Name: MonthlyFee MonthlyFee_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."MonthlyFee"
    ADD CONSTRAINT "MonthlyFee_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Organization Organization_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_pkey" PRIMARY KEY (id);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: QRCode QRCode_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."QRCode"
    ADD CONSTRAINT "QRCode_pkey" PRIMARY KEY (id);


--
-- Name: RepairCost RepairCost_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."RepairCost"
    ADD CONSTRAINT "RepairCost_pkey" PRIMARY KEY (id);


--
-- Name: RepairMedia RepairMedia_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."RepairMedia"
    ADD CONSTRAINT "RepairMedia_pkey" PRIMARY KEY (id);


--
-- Name: RepairOrder RepairOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."RepairOrder"
    ADD CONSTRAINT "RepairOrder_pkey" PRIMARY KEY (id);


--
-- Name: RepairPart RepairPart_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."RepairPart"
    ADD CONSTRAINT "RepairPart_pkey" PRIMARY KEY (id);


--
-- Name: SystemConfig SystemConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."SystemConfig"
    ADD CONSTRAINT "SystemConfig_pkey" PRIMARY KEY (id);


--
-- Name: UserProject UserProject_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."UserProject"
    ADD CONSTRAINT "UserProject_pkey" PRIMARY KEY ("userId", "projectId");


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WorkflowInstance WorkflowInstance_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."WorkflowInstance"
    ADD CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY (id);


--
-- Name: WorkflowNode WorkflowNode_pkey; Type: CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."WorkflowNode"
    ADD CONSTRAINT "WorkflowNode_pkey" PRIMARY KEY (id);


--
-- Name: Contract_contractNo_key; Type: INDEX; Schema: public; Owner: elevator
--

CREATE UNIQUE INDEX "Contract_contractNo_key" ON public."Contract" USING btree ("contractNo");


--
-- Name: Elevator_regCode_key; Type: INDEX; Schema: public; Owner: elevator
--

CREATE UNIQUE INDEX "Elevator_regCode_key" ON public."Elevator" USING btree ("regCode");


--
-- Name: MaintenanceUnit_name_key; Type: INDEX; Schema: public; Owner: elevator
--

CREATE UNIQUE INDEX "MaintenanceUnit_name_key" ON public."MaintenanceUnit" USING btree (name);


--
-- Name: QRCode_code_key; Type: INDEX; Schema: public; Owner: elevator
--

CREATE UNIQUE INDEX "QRCode_code_key" ON public."QRCode" USING btree (code);


--
-- Name: QRCode_elevatorId_key; Type: INDEX; Schema: public; Owner: elevator
--

CREATE UNIQUE INDEX "QRCode_elevatorId_key" ON public."QRCode" USING btree ("elevatorId");


--
-- Name: RepairOrder_orderNo_key; Type: INDEX; Schema: public; Owner: elevator
--

CREATE UNIQUE INDEX "RepairOrder_orderNo_key" ON public."RepairOrder" USING btree ("orderNo");


--
-- Name: SystemConfig_key_key; Type: INDEX; Schema: public; Owner: elevator
--

CREATE UNIQUE INDEX "SystemConfig_key_key" ON public."SystemConfig" USING btree (key);


--
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: elevator
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- Name: User_wxOpenId_key; Type: INDEX; Schema: public; Owner: elevator
--

CREATE UNIQUE INDEX "User_wxOpenId_key" ON public."User" USING btree ("wxOpenId");


--
-- Name: WorkflowInstance_repairOrderId_key; Type: INDEX; Schema: public; Owner: elevator
--

CREATE UNIQUE INDEX "WorkflowInstance_repairOrderId_key" ON public."WorkflowInstance" USING btree ("repairOrderId");


--
-- Name: Building Building_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."Building"
    ADD CONSTRAINT "Building_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ContractElevator ContractElevator_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."ContractElevator"
    ADD CONSTRAINT "ContractElevator_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public."Contract"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ContractElevator ContractElevator_elevatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."ContractElevator"
    ADD CONSTRAINT "ContractElevator_elevatorId_fkey" FOREIGN KEY ("elevatorId") REFERENCES public."Elevator"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ContractEvaluation ContractEvaluation_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."ContractEvaluation"
    ADD CONSTRAINT "ContractEvaluation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public."Contract"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ContractPart ContractPart_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."ContractPart"
    ADD CONSTRAINT "ContractPart_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public."Contract"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Contract Contract_maintenanceUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_maintenanceUnitId_fkey" FOREIGN KEY ("maintenanceUnitId") REFERENCES public."MaintenanceUnit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Elevator Elevator_customerServiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."Elevator"
    ADD CONSTRAINT "Elevator_customerServiceId_fkey" FOREIGN KEY ("customerServiceId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Elevator Elevator_maintainerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."Elevator"
    ADD CONSTRAINT "Elevator_maintainerId_fkey" FOREIGN KEY ("maintainerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Elevator Elevator_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."Elevator"
    ADD CONSTRAINT "Elevator_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Elevator Elevator_safetyDirectorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."Elevator"
    ADD CONSTRAINT "Elevator_safetyDirectorId_fkey" FOREIGN KEY ("safetyDirectorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Elevator Elevator_safetyOfficerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."Elevator"
    ADD CONSTRAINT "Elevator_safetyOfficerId_fkey" FOREIGN KEY ("safetyOfficerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FaultRecord FaultRecord_elevatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."FaultRecord"
    ADD CONSTRAINT "FaultRecord_elevatorId_fkey" FOREIGN KEY ("elevatorId") REFERENCES public."Elevator"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FundMaterial FundMaterial_instanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."FundMaterial"
    ADD CONSTRAINT "FundMaterial_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES public."WorkflowInstance"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InspectionPhoto InspectionPhoto_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."InspectionPhoto"
    ADD CONSTRAINT "InspectionPhoto_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."InspectionTask"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InspectionTask InspectionTask_elevatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."InspectionTask"
    ADD CONSTRAINT "InspectionTask_elevatorId_fkey" FOREIGN KEY ("elevatorId") REFERENCES public."Elevator"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InspectionTask InspectionTask_inspectorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."InspectionTask"
    ADD CONSTRAINT "InspectionTask_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MaintenancePlan MaintenancePlan_elevatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."MaintenancePlan"
    ADD CONSTRAINT "MaintenancePlan_elevatorId_fkey" FOREIGN KEY ("elevatorId") REFERENCES public."Elevator"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MonthlyFeeItem MonthlyFeeItem_elevatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."MonthlyFeeItem"
    ADD CONSTRAINT "MonthlyFeeItem_elevatorId_fkey" FOREIGN KEY ("elevatorId") REFERENCES public."Elevator"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MonthlyFeeItem MonthlyFeeItem_monthlyFeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."MonthlyFeeItem"
    ADD CONSTRAINT "MonthlyFeeItem_monthlyFeeId_fkey" FOREIGN KEY ("monthlyFeeId") REFERENCES public."MonthlyFee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Project Project_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QRCode QRCode_elevatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."QRCode"
    ADD CONSTRAINT "QRCode_elevatorId_fkey" FOREIGN KEY ("elevatorId") REFERENCES public."Elevator"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RepairCost RepairCost_repairId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."RepairCost"
    ADD CONSTRAINT "RepairCost_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES public."RepairOrder"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RepairMedia RepairMedia_repairId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."RepairMedia"
    ADD CONSTRAINT "RepairMedia_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES public."RepairOrder"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RepairOrder RepairOrder_assigneeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."RepairOrder"
    ADD CONSTRAINT "RepairOrder_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RepairOrder RepairOrder_elevatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."RepairOrder"
    ADD CONSTRAINT "RepairOrder_elevatorId_fkey" FOREIGN KEY ("elevatorId") REFERENCES public."Elevator"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RepairOrder RepairOrder_reporterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."RepairOrder"
    ADD CONSTRAINT "RepairOrder_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RepairPart RepairPart_repairId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."RepairPart"
    ADD CONSTRAINT "RepairPart_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES public."RepairOrder"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserProject UserProject_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."UserProject"
    ADD CONSTRAINT "UserProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserProject UserProject_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."UserProject"
    ADD CONSTRAINT "UserProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_supervisorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: WorkflowInstance WorkflowInstance_repairOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."WorkflowInstance"
    ADD CONSTRAINT "WorkflowInstance_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES public."RepairOrder"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: WorkflowNode WorkflowNode_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."WorkflowNode"
    ADD CONSTRAINT "WorkflowNode_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: WorkflowNode WorkflowNode_instanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: elevator
--

ALTER TABLE ONLY public."WorkflowNode"
    ADD CONSTRAINT "WorkflowNode_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES public."WorkflowInstance"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict BZKuWzqP92fbvny9t0nuF7s0LA0zQaNu3GrTDZYpuQgNkgzcwncG4cziUQ1uaiE

