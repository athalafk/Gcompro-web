export type AuthFormState = { error?: string | null };

export type ProfileAdmin = {
  full_name: string | null;
  role: "admin";
};

export type ProfileStudent = {
  id: string | null;
  full_name: string | null;
  role: "student";
  nim: string;
  prodi: string | null;
};

export type MyProfile = ProfileAdmin | ProfileStudent;

export type ErrorResponse = { error: string };

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

export type ChangePasswordResult = {
  ok?: boolean;
  message?: string;
  error?: string;
};