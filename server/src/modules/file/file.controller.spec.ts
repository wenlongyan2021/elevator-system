import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FileController } from './file.controller';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('FileController', () => {
  let controller: FileController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileController],
      providers: [
        { provide: JwtAuthGuard, useValue: { canActivate: () => true } },
      ],
    }).compile();

    controller = module.get<FileController>(FileController);
  });

  describe('serveFile - path traversal protection', () => {
    it('should throw on null/empty file path', () => {
      expect(() => (controller as any).serveFile(null)).toThrow(NotFoundException);
      expect(() => (controller as any).serveFile('')).toThrow(NotFoundException);
    });

    it('should reject path traversal with ../', () => {
      expect(() => (controller as any).serveFile('../../../etc/passwd')).toThrow(
        BadRequestException,
      );
    });

    it('should reject absolute path traversal attempts', () => {
      expect(() => (controller as any).serveFile('/etc/passwd')).toThrow(
        BadRequestException,
      );
    });

    it('should reject any attempt to escape upload directory (throws BadRequest or NotFound)', () => {
      // The key requirement: every traversal attempt is blocked
      const attempts = [
        '....//....//etc/passwd',
        '..%252f..%252fetc/passwd',
        '..\\..\\etc\\passwd',
      ];
      for (const path of attempts) {
        try {
          (controller as any).serveFile(path);
          // If no throw, that's a failure
          fail(`Expected throw for path: ${path}`);
        } catch (err: any) {
          expect(
            err instanceof BadRequestException || err instanceof NotFoundException,
          ).toBe(true);
        }
      }
    });

    it('should not throw BadRequest for legitimate paths (only NotFound if file absent)', () => {
      try {
        (controller as any).serveFile('test-image.jpg');
      } catch (err: any) {
        // A legitimate path should never throw BadRequest (that would mean a security check failed)
        expect(err).not.toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe('uploadFile - MIME type validation', () => {
    it('should reject executable files (.exe)', async () => {
      const fakeFile = {
        mimetype: 'application/x-msdownload',
        originalname: 'virus.exe',
        path: '/tmp/uploads/virus.exe',
        filename: 'virus.exe',
        size: 1024,
      } as Express.Multer.File;

      await expect(controller.uploadFile(fakeFile)).rejects.toThrow(BadRequestException);
    });

    it('should reject HTML files (XSS vector)', async () => {
      const fakeFile = {
        mimetype: 'text/html',
        originalname: 'page.html',
        path: '/tmp/uploads/page.html',
        filename: 'page.html',
        size: 512,
      } as Express.Multer.File;

      await expect(controller.uploadFile(fakeFile)).rejects.toThrow(BadRequestException);
    });

    it('should accept allowed image types (will fail on sharp, not on MIME)', async () => {
      const fakeFile = {
        mimetype: 'image/jpeg',
        originalname: 'photo.jpg',
        path: '/tmp/uploads/photo.jpg',
        filename: 'photo.jpg',
        size: 10240,
      } as Express.Multer.File;

      try {
        await controller.uploadFile(fakeFile);
      } catch (err: any) {
        // Should NOT throw BadRequestException (MIME check passes)
        expect(err).not.toBeInstanceOf(BadRequestException);
      }
    });

    it('should accept PDF files', async () => {
      const fakeFile = {
        mimetype: 'application/pdf',
        originalname: 'doc.pdf',
        path: '/tmp/uploads/doc.pdf',
        filename: 'doc.pdf',
        size: 20480,
      } as Express.Multer.File;

      try {
        await controller.uploadFile(fakeFile);
      } catch (err: any) {
        expect(err).not.toBeInstanceOf(BadRequestException);
      }
    });
  });
});
