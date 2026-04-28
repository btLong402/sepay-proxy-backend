import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    // Kiểm tra xem Token đã tồn tại chưa
    const existingToken = await this.prisma.fcmToken.findUnique({
      where: { token: dto.token },
    });

    if (existingToken) {
      if (existingToken.userId !== userId) {
        // Chuyển quyền sở hữu Token sang User mới (Xóa cũ, tạo mới)
        await this.prisma.fcmToken.delete({
          where: { id: existingToken.id },
        });
      } else {
        // Cập nhật metadata nếu cùng User
        return this.prisma.fcmToken.update({
          where: { id: existingToken.id },
          data: {
            deviceType: dto.deviceType,
            appVersion: dto.appVersion,
            isRevoked: false,
            deletedAt: null,
          },
        });
      }
    }

    // Tạo mới Token
    return this.prisma.fcmToken.create({
      data: {
        userId,
        token: dto.token,
        deviceType: dto.deviceType,
        appVersion: dto.appVersion,
      },
    });
  }

  async removeDevice(userId: string, token: string) {
    const existingToken = await this.prisma.fcmToken.findUnique({
      where: { token },
    });

    if (!existingToken || existingToken.userId !== userId) {
      throw new NotFoundException('Không tìm thấy thiết bị hoặc không có quyền');
    }

    return this.prisma.fcmToken.delete({
      where: { id: existingToken.id },
    });
  }

  async listDevices(userId: string) {
    return this.prisma.fcmToken.findMany({
      where: {
        userId,
        isRevoked: false,
        deletedAt: null,
      },
      orderBy: { lastActive: 'desc' },
    });
  }
}
