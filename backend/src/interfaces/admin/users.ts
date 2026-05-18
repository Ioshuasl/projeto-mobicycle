export const ADMIN_EDITABLE_USER_FIELDS = [
  "name",
  "email",
  "phone",
  "cpf",
  "nickname",
  "birth_date",
  "pix_key",
  "balance",
  "cashback_balance",
  "snack_fast_cashback",
  "energy_cashback",
  "guincho_cashback",
  "hability_test_cashback",
  "voucher_balance",
  "document_status",
  "stars",
  "status",
  "career_level",
  "role",
  "is_activated",
] as const;

export type AdminEditableUserField = (typeof ADMIN_EDITABLE_USER_FIELDS)[number];

export function isAdminEditableUserField(field: string): field is AdminEditableUserField {
  return (ADMIN_EDITABLE_USER_FIELDS as readonly string[]).includes(field);
}

export type AdminUserListQuery = {
  page?: string;
  limit?: string;
  search?: string;
};

export type AdminNetworkNode = Record<string, unknown> & {
  id: string;
  children: AdminNetworkNode[];
};
