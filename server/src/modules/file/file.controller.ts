import {
  Controller,
  Get,
  Post,
  Param,
  Logger,
  NotFoundException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, resolve } from 'path';
import { createReadStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

interface FileRecord {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  thumbnail: string | null;
  createdAt: Date;
}

@ApiTags('文件管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FileController {
  private readonly logger = new Logger(FileController.name);
  private readonly uploadDir: string;
  // Allowed MIME types for file uploads
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4', 'video/quicktime',
  ];

  /**
   * In-memory file metadata store.
   * In production this should be persisted to a database.
   */
  private readonly fileRecords: Map<string, FileRecord> = new Map();
  private recordIdSeq = 0;

  constructor() {
    this.uploadDir = resolve(process.cwd(), 'uploads');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  @Post('upload')
  @ApiOperation({ summary: '上传文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname);
          const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    // Validate MIME type whitelist
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      // Remove the rejected file
      if (file.path && existsSync(file.path)) {
        unlinkSync(file.path);
      }
      throw new BadRequestException(
        `不支持的文件类型: ${file.mimetype}`,
      );
    }

    const isImage = file.mimetype.startsWith('image/');
    let thumbnail: string | null = null;

    // Generate thumbnail for images using sharp
    if (isImage) {
      try {
        const sharpModule = await import('sharp');
        const thumbName = `thumb_${file.filename}`;
        const thumbPath = join(this.uploadDir, thumbName);
        await sharpModule.default(file.path)
          .resize(300, 300, { fit: 'cover' })
          .toFile(thumbPath);
        thumbnail = thumbName;
      } catch (err: any) {
        this.logger.warn(`缩略图生成失败: ${err.message}`);
      }
    }

    const recordId = String(++this.recordIdSeq);
    const record: FileRecord = {
      id: recordId,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      thumbnail,
      createdAt: new Date(),
    };
    this.fileRecords.set(recordId, record);

    return record;
  }

  @Get(':id')
  @ApiOperation({ summary: '获取文件信息' })
  async getFileInfo(@Param('id') id: string) {
    const record = this.fileRecords.get(id);
    if (!record) {
      throw new NotFoundException('文件不存在');
    }
    return record;
  }

  /**
   * Serve a static file from the uploads directory.
   */
  @Get('*filePath')
  @ApiOperation({ summary: '获取静态文件' })
  serveFile(@Param('filePath') filePath: string) {
    if (!filePath) {
      throw new NotFoundException('文件路径无效');
    }

    // Path traversal protection: resolve and validate
    const fullPath = resolve(this.uploadDir, filePath);
    if (!fullPath.startsWith(resolve(this.uploadDir) + '/')) {
      throw new BadRequestException('无效的文件路径');
    }
    if (!existsSync(fullPath)) {
      throw new NotFoundException('文件不存在');
    }

    const stream = createReadStream(fullPath);
    return new StreamableFile(stream);
  }
}
