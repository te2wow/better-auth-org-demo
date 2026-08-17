import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "../db";
import * as schema from "../db/schema";
import { ac, owner, admin, member } from "./permissions";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: {
    enabled: true,
    // デモなのでメール確認はスキップする
    requireEmailVerification: false,
  },
  databaseHooks: {
    session: {
      create: {
        // ログイン直後の activeOrganizationId は既定で null なので、
        // セッション作成前に「最初に所属している組織」を埋めておく
        before: async (session) => {
          const firstMembership = await db.query.member.findFirst({
            where: (m, { eq }) => eq(m.userId, session.userId),
          });
          return {
            data: {
              ...session,
              activeOrganizationId: firstMembership?.organizationId ?? null,
            },
          };
        },
      },
    },
  },
  plugins: [
    organization({
      ac,
      roles: { owner, admin, member },
      // 招待メールは自前で送る。デモではサーバログに URL を出すだけ
      async sendInvitationEmail(data) {
        const inviteLink = `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/accept-invitation/${data.id}`;
        console.log(`[invitation] to=${data.email} link=${inviteLink}`);
      },
      organizationHooks: {
        afterCreateOrganization: async ({ organization, member, user }) => {
          console.log(
            `[afterCreateOrganization] org=${organization.id} member=${member.id} role=${member.role} user=${user.id}`,
          );
        },
        afterAcceptInvitation: async ({ invitation, member }) => {
          console.log(
            `[afterAcceptInvitation] invitation=${invitation.id} -> member=${member.id}`,
          );
        },
      },
    }),
  ],
});
