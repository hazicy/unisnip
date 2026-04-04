export type UserBasic = {
  id?: number;
  login?: string;
  name?: string;
  avatar_url?: string;
  url?: string;
  html_url?: string;
  /**
   * 企业备注名
   */
  remark?: string;
  followers_url?: string;
  following_url?: string;
  gists_url?: string;
  starred_url?: string;
  subscriptions_url?: string;
  organizations_url?: string;
  repos_url?: string;
  events_url?: string;
  received_events_url?: string;
  type?: string;
  member_role?: string;
};

export type GistObject = {
  url?: string;
  forks_url?: string;
  commits_url?: string;
  id?: string;
  description?: string;
  public?: boolean;
  owner?: UserBasic;
  user?: UserBasic;
  files?: Record<string, any>;
  truncated?: boolean;
  html_url?: string;
  comments?: number;
  comments_url?: string;
  git_pull_url?: string;
  git_push_url?: string;
  created_at?: string;
  updated_at?: string;
  forks?: string;
  history?: string;
};
