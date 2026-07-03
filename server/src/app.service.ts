import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getServerInfo() {
    return {
      project: 'PetVerse',
      version: '0.1.0',
      status: 'running',
      message: 'Welcome to PetVerse API',
      time: new Date(),
    };
  }
}