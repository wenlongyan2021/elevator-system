import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class ListNotificationQueryDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

@ApiTags('消息通知')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: '获取我的通知列表' })
  async list(
    @CurrentUser() user: any,
    @Query() query: ListNotificationQueryDto,
  ) {
    return this.notificationService.getNotifications({
      userId: user.id,
      isRead: query.isRead,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读通知数量' })
  async unreadCount(@CurrentUser() user: any) {
    return this.notificationService.getUnreadCount(user.id);
  }

  @Put(':id/read')
  @ApiOperation({ summary: '标记通知为已读' })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationService.markAsRead(id, user.id);
  }

  @Put('read-all')
  @ApiOperation({ summary: '全部标记为已读' })
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationService.markAllAsRead(user.id);
  }
}
