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

export class UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export class ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
