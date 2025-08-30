export class User {
    id: string;
    username: string;
    email: string;
    password: string;
    role: 'user' | 'group_admin' | 'super_admin';
    groups: number[];
  
    constructor(id: string, username: string, email: string, password: string, role: 'user' | 'group_admin' | 'super_admin', groups: number[] = []) {
      this.id = id;
      this.username = username;
      this.email = email;
      this.password = password;
      this.role = role;
      this.groups = groups;
    }
  }