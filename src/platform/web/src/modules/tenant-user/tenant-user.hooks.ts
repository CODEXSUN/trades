import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateTenantUser,
  createTenantUser,
  deactivateTenantUser,
  forceDeleteTenantUser,
  listTenantUsers,
  updateTenantUser
} from "./tenant-user.services";
import {
  getTenantUserProfile,
  updateTenantUserProfile,
  uploadTenantUserAvatar
} from "./tenant-user.services";
import type { TenantUserProfileSavePayload } from "./tenant-user.types";
import type { TenantUser, TenantUserSavePayload } from "./tenant-user.types";
export const tenantUserQueryKey = ["tenant", "access", "users"] as const;
export const tenantUserProfileQueryKey = ["tenant", "profile"] as const;
export function useTenantUserProfileQuery() {
  return useQuery({ queryFn: getTenantUserProfile, queryKey: tenantUserProfileQueryKey });
}
export function useTenantUserProfileMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      avatar,
      payload
    }: {
      avatar: File | null;
      payload: TenantUserProfileSavePayload;
    }) => {
      const profile = await updateTenantUserProfile(payload);
      if (avatar) await uploadTenantUserAvatar(avatar);
      return profile;
    },
    onSettled: () => client.invalidateQueries({ queryKey: tenantUserProfileQueryKey })
  });
}
export function useTenantUsersQuery() {
  return useQuery({ queryFn: () => listTenantUsers(), queryKey: tenantUserQueryKey });
}
export function useTenantUserMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: tenantUserQueryKey });
  return {
    activate: useMutation({
      mutationFn: (record: TenantUser) => activateTenantUser(record.id),
      onSuccess: done
    }),
    create: useMutation({ mutationFn: createTenantUser, onSuccess: done }),
    deactivate: useMutation({
      mutationFn: (record: TenantUser) => deactivateTenantUser(record.id),
      onSuccess: done
    }),
    forceDelete: useMutation({
      mutationFn: (record: TenantUser) => forceDeleteTenantUser(record.id),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: TenantUserSavePayload }) =>
        updateTenantUser(id, payload),
      onSuccess: done
    })
  };
}
