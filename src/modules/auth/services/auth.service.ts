import { Body, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { instanceToPlain } from 'class-transformer';
import { UserService } from '../../user/services/user.service';
import { RegisterRequest } from '../dto/registerRequest.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  public async register(request: RegisterRequest) {
    const hashedPassword = await bcrypt.hash(request.password, 12);
    const createdUser = await this.userService.addUser({
      ...request,
      password: hashedPassword,
    });

    const accessToken = await this.jwtService.signAsync(
      instanceToPlain(createdUser),
      {
        secret: this.config.get<string>('JWT_SECRET'),
      },
    );
    return accessToken;
  }

  public async getAuthenticatedUser(email: string, plainTextPassword: string) {
    const user = await this.userService.getByEmail(email);
    await this.verifyPassword(plainTextPassword, user.password);
    return user;
  }

  private async verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ) {
    const isPasswordMatching = await bcrypt.compare(
      plainTextPassword,
      hashedPassword,
    );

    // TODO 지금 비밀번호 틀리면 걍 서버 터짐
    if (!isPasswordMatching) {
      throw new HttpException('패스워드가 틀렸습니다.', HttpStatus.BAD_REQUEST);
    }
  }

  public async getAccessToken(@Body() email: string) {
    const user = await this.userService.getByEmail(email);
    const accessToken = await this.jwtService.signAsync(instanceToPlain(user), {
      secret: this.config.get<string>('JWT_SECRET'),
    });
    return accessToken;
  }
}