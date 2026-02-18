
import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1')
    .setProject('6985087b00129826ee02')
    .setKey('standard_f6532494a576796deee71b4ca043e18bdf1b06b6e4336447d795699da75b951cde148195b154cf8440207df0eab6e832e88b1eb75d7031a000699a0bec571a39ee70b7548c27bd249b45b4dc6919f2e06f37436bffca3049182b0f626bb0f8833db95ae168cde7bf8bc7d8b56580c5326d54a818652fe3c6d110ef0fa98aa9f6');

const databases = new Databases(client);
const DB_ID = 'scorecards_db_main';
const COLL_SCORES = 'employee_scores_main';
const COLL_ACCESS = 'employee_access';

async function syncNames() {
    try {
        console.log('🔄 Starting Database Name Sync...');

        // 1. Rename "Deepanshu" -> "Deepanshu Rawat" in scores
        console.log('\n🔎 Checking "Deepanshu" in scores...');
        const deepanshuDocs = await databases.listDocuments(DB_ID, COLL_SCORES, [Query.equal('employee_name', 'Deepanshu')]);
        for (const doc of deepanshuDocs.documents) {
            console.log(`✅ Updating score record ${doc.$id} to "Deepanshu Rawat"`);
            await databases.updateDocument(DB_ID, COLL_SCORES, doc.$id, { employee_name: 'Deepanshu Rawat' });
        }

        // 2. Rename "Mohd Sameer" (no dot) -> "Mohd. Sameer" in access if exists
        console.log('\n🔎 Checking "Mohd Sameer" in access...');
        const sameerAccessDocs = await databases.listDocuments(DB_ID, COLL_ACCESS, [Query.equal('employee_name', 'Mohd Sameer')]);
        for (const doc of sameerAccessDocs.documents) {
            console.log(`✅ Updating access record ${doc.$id} to "Mohd. Sameer"`);
            await databases.updateDocument(DB_ID, COLL_ACCESS, doc.$id, { employee_name: 'Mohd. Sameer' });
        }

        // 3. Just to be safe, check scores for "Mohd Sameer" too
        console.log('\n🔎 Checking "Mohd Sameer" in scores...');
        const sameerScoreDocs = await databases.listDocuments(DB_ID, COLL_SCORES, [Query.equal('employee_name', 'Mohd Sameer')]);
        for (const doc of sameerScoreDocs.documents) {
            console.log(`✅ Updating score record ${doc.$id} to "Mohd. Sameer"`);
            await databases.updateDocument(DB_ID, COLL_SCORES, doc.$id, { employee_name: 'Mohd. Sameer' });
        }

        console.log('\n🎉 Sync Complete!');

    } catch (error) {
        console.error('❌ Sync Failed:', error);
    }
}

syncNames();
