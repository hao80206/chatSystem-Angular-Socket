export class User {
    id: string;
    username: string;
    email: string;
    password: string;
    role: string[];  // ['USER'], ['GROUP_ADMIN'], ['SUPER_ADMIN']
    groups: number[];
    profileImg: string;
  
    constructor(id: string, username: string, email: string, password: string, role: string[]=[], groups: number[] = [], profileImg:string) {
      this.id = id;
      this.username = username;
      this.email = email;
      this.password = password;
      this.role = role;
      this.groups = groups;
      this.profileImg = profileImg;
    }
  }