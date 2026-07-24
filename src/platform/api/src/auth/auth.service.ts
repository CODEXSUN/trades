import { env } from "../env.js";
import { TenantRepository } from "../modules/tenant/tenant.repository.js";
import { signAuthToken } from "./jwt.js";
import { verifyPassword } from "./password-hash.js";

const tenantRepository = new TenantRepository();

export class AuthService {
  async login(input: LoginInput) {
    const email = input.email?.trim().toLowerCase() ?? "";
    const password = input.password ?? "";
    if (!email || !password) return null;
    return this.loginTenant({ ...input, email, password });
  }

  private async loginTenant(input: Required<Pick<LoginInput, "email" | "password">> & LoginInput) {
    const tenant = await tenantRepository.findByCorporateId(env.CLIENT_CORPORATE_ID);
    if (!tenant || tenant.status !== "active") {
      return null;
    }

    const user = await tenantRepository.findTenantUserByEmail(tenant, input.email);
    if (!user || user.status !== "active" || !verifyPassword(input.password, user.password_hash)) {
      return null;
    }
    const permissions = await tenantRepository.findTenantUserPermissionKeys(tenant, user.id);

    return {
      accessToken: signAuthToken({
        email: user.email,
        name: user.name,
        tenantCode: tenant.tenantCode,
        tenantDbName: tenant.dbName,
        tenantId: tenant.uuid,
        tenantUuid: tenant.uuid,
        tenantRole: user.role,
        permissions,
        userId: user.uuid,
        userType: "tenant"
      }),
      email: user.email,
      name: user.name,
      tenantCode: tenant.tenantCode,
      tenantDbName: tenant.dbName,
      tenantId: tenant.uuid,
      tenantUuid: tenant.uuid,
      tenantRole: user.role,
      permissions,
      userType: "tenant" as const
    };
  }
}

type LoginInput = {
  email?: string;
  password?: string;
};
