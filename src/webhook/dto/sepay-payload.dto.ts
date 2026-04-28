import { IsNotEmpty, IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';

export class SepayPayloadDto {
  @IsNotEmpty()
  id: number | string;

  @IsOptional()
  @IsString()
  gateway_id?: string;

  @IsOptional()
  @IsString()
  account_number?: string;

  @IsOptional()
  @IsString()
  sub_account?: string;

  @IsOptional()
  @IsString()
  transfer_type?: string;

  @IsOptional()
  @IsString()
  transfer_date?: string;

  @IsOptional()
  @IsNumber()
  amount_in?: number;

  @IsOptional()
  @IsNumber()
  amount_out?: number;

  @IsOptional()
  @IsNumber()
  accumulated?: number;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  transaction_content?: string;

  @IsOptional()
  @IsString()
  reference_number?: string;

  @IsOptional()
  @IsString()
  body?: string;
}
