import { Controller, Post, Delete, Get, Body, UseGuards, Request, UsePipes, ValidationPipe } from '@nestjs/common';
import { DeviceService } from './device.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/devices')
@UseGuards(JwtAuthGuard)
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async registerDevice(@Request() req: any, @Body() dto: RegisterDeviceDto) {
    return this.deviceService.registerDevice(req.user.id, dto);
  }

  @Delete()
  async removeDevice(@Request() req: any, @Body('token') token: string) {
    return this.deviceService.removeDevice(req.user.id, token);
  }

  @Get()
  async listDevices(@Request() req: any) {
    return this.deviceService.listDevices(req.user.id);
  }
}
