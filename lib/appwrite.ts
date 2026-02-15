import { Client, Account, Databases, Storage } from 'appwrite';

export const client = new Client();

client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Constants
export const DB_ID = 'scorecards_db_main';
export const SCORES_COLLECTION_ID = 'employee_scores_main';
export const ACCESS_COLLECTION_ID = 'employee_access';
