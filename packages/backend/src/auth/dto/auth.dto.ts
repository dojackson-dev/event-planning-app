export class RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
}

export class LoginDto {
  email: string;
  password: string;
}
