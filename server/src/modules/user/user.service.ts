import { Injectable } from "@nestjs/common";
import { User } from "./user.entity";

@Injectable()
export class UserService {

  getCurrentUser():User {

    return {
      id:1,
      openid:"wx_test_openid",
      unionid:"",
      nickname:"PetVerse玩家",
      avatar:"",
      level:1,
      vipLevel:0,
      exp:0,
      gold:1000,
      diamond:100,
      createTime:new Date()
    };

  }

}