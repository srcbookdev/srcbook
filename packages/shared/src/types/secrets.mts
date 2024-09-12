export type SecretWithAssociatedSessions = {
  name: string;
  value: string;
  associatedWithSessionIds: Array<string>;
};
