import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  ownerAc,
  adminAc,
  memberAc,
} from "better-auth/plugins/organization/access";

// defaultStatements を展開せずに独自 statement だけを渡すと、
// organization / member / invitation に対する既定の権限が消える
export const statement = {
  ...defaultStatements,
  project: ["create", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  ...ownerAc.statements,
  project: ["create", "update", "delete"],
});

export const admin = ac.newRole({
  ...adminAc.statements,
  project: ["create", "update"],
});

export const member = ac.newRole({
  ...memberAc.statements,
  project: ["create"],
});
