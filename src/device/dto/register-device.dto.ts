import { IsString, IsOptional, IsIn } from 'class-validator';

export class RegisterDeviceDto {
  @IsString({ message: 'Token phải là chuỗi' })
  token: string;

  @IsOptional()
  @IsString()
  @IsIn(['ios', 'android'], { message: 'Device type chỉ có thể là ios hoặc android' })
  deviceType?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;
}
