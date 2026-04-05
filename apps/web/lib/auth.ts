import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  database: {
    provider: 'sqlite',
    url: process.env.DATABASE_URL || './auth.db',
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
    // Gitee OAuth - 使用自定义 OAuth2 配置
    oauth2: {
      issuer: 'https://gitee.com/oauth',
      clientId: process.env.GITEE_CLIENT_ID || '',
      clientSecret: process.env.GITEE_CLIENT_SECRET || '',
      authorizationURL: 'https://gitee.com/oauth/authorize',
      tokenURL: 'https://gitee.com/oauth/token',
      userInfoURL: 'https://gitee.com/api/v5/user',
      scopes: ['user_info'],
      getUserInfo: async (tokens) => {
        const response = await fetch('https://gitee.com/api/v5/user', {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        });
        const data = await response.json();
        return {
          id: String(data.id),
          name: data.name,
          email: data.email,
          image: data.avatar_url,
        };
      },
    },
  },
  trustedOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.BETTER_AUTH_URL,
  ].filter(Boolean) as string[],
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;