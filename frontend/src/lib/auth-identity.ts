export type IdentityRecord = {
  id: string;
  username: string;
  email: string;
};

export type IdentityResult<T extends IdentityRecord> =
  | { ok: true; record: T }
  | { ok: false; status: 400 | 409; message: string };

function norm(value: string) {
  return value.trim().toLowerCase();
}

export function resolveUniqueIdentity<T extends IdentityRecord>(
  records: T[],
  username: string,
  email: string
): IdentityResult<T> {
  const u = norm(username);
  const e = norm(email);

  if (!u || !e) {
    return { ok: false, status: 400, message: "Username and email are required." };
  }

  const byUsername = records.filter((r) => norm(r.username) === u);
  const byEmail = records.filter((r) => norm(r.email) === e);

  if (byUsername.length > 1 || byEmail.length > 1) {
    return {
      ok: false,
      status: 409,
      message: "Duplicate username or email exists. Each account must be uniquely identified.",
    };
  }

  const userRec = byUsername[0];
  const emailRec = byEmail[0];

  if (userRec && emailRec && userRec.id !== emailRec.id) {
    return {
      ok: false,
      status: 409,
      message: "Username and email belong to different accounts.",
    };
  }

  if (!userRec && !emailRec) {
    return {
      ok: false,
      status: 400,
      message:
        "No pre-existing club record found for this username and email. Sign-in and registration require an existing roster entry.",
    };
  }

  if (userRec && !emailRec) {
    return {
      ok: false,
      status: 400,
      message: "Email does not match the pre-existing record for this username.",
    };
  }

  if (emailRec && !userRec) {
    return {
      ok: false,
      status: 400,
      message: "Username does not match the pre-existing record for this email.",
    };
  }

  return { ok: true, record: userRec };
}
