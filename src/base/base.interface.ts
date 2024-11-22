import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export interface Meta {
  totalCount: number;
  pageCount: number;
  currentPage: number;
  perPage: number;
}

export const EntityStatus = {
  Active: 10,
  Suspended: 20,
  Deleted: 30,
};

export class Entity {
  public id: string;
  public name: string;
  public status: number;

  public city: string;
  public district: string;
  public address: string;
  public lat: number;
  public lng: number;
  public meta: {
    cityName: string;
    districtName: string;
  };

  public createdAt: string;
}

export class EntityAdd {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsString()
  district: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsNumber()
  lat: number;

  @IsNotEmpty()
  @IsNumber()
  lng: number;
}
