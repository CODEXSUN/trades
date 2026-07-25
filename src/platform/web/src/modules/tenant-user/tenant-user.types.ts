export type TenantUserStatus = "active" | "inactive" | "suspended";
export type TenantUser = {
  id: number;
  isProtected: boolean;
  email: string;
  name: string;
  password?: string;
  status: TenantUserStatus;
  uuid: string;
};
export type TenantUserSavePayload = {
  email: string;
  name: string;
  password?: string;
  status: TenantUserStatus;
};
export type TenantUserListFilters = { search?: string };
export type TenantUserProfile = {
  avatarPath: string;
  avatarUrl: string;
  email: string;
  id: number;
  name: string;
  uuid: string;
};
export type TenantUserProfileSavePayload = { email: string; name: string; password?: string | undefined };
export type TenantUserProfileFormValue = TenantUserProfileSavePayload & { confirmPassword: string };
