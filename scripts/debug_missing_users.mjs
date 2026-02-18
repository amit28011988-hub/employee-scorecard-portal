
import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1')
    .setProject('6985087b00129826ee02')
    .setKey('standard_f6532494a576796deee71b4ca043e18bdf1b06b6e4336447d795699da75b951cde148195b154cf8440207df0eab6e832e88b1eb75d7031a000699a0bec571a39ee70b7548c27bd249b45b4dc6919f2e06f37436bffca3049182b0f626bb0f8833db95ae168cde7bf8bc7d8b56580c5326d54a818652fe3c6d110ef0fa98aa9f6');

const databases = new Databases(client);
const DB_ID = 'scorecards_db_main';
const COLL_ID = 'employee_scores_main';

async function checkData() {
    try {
        console.log('🔍 Checking all documents in collection...');
        const response = await databases.listDocuments(DB_ID, COLL_ID, [Query.limit(100)]);

        console.log(`Total documents found: ${response.total}`);

        const targetNames = ['mohd sameer', 'deepanshu'];

        response.documents.forEach(doc => {
            const name = doc.employee_name.toLowerCase().trim();
            if (targetNames.some(t => name.includes(t))) {
                console.log('-------------------');
                console.log(`ID: ${doc.$id}`);
                console.log(`Name: "${doc.employee_name}"`);
                console.log(`Month: "${doc.month}"`);
                console.log(`Team: "${doc.team}"`);
                console.log(`Score: ${doc.total_score}`);
            }
        });

        console.log('\n🔍 Unique months in DB:');
        const months = [...new Set(response.documents.map(d => d.month))];
        console.log(months);

        console.log('\n🔍 All names in DB:');
        const allNames = response.documents.map(d => `"${d.employee_name}"`);
        console.log(allNames.join(', '));

    } catch (error) {
        console.error('❌ Error checking data:', error);
    }
}

checkData();
