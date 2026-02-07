
import { Client, Databases } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1')
    .setProject('6985087b00129826ee02')
    .setKey('standard_f6532494a576796deee71b4ca043e18bdf1b06b6e4336447d795699da75b951cde148195b154cf8440207df0eab6e832e88b1eb75d7031a000699a0bec571a39ee70b7548c27bd249b45b4dc6919f2e06f37436bffca3049182b0f626bb0f8833db95ae168cde7bf8bc7d8b56580c5326d54a818652fe3c6d110ef0fa98aa9f6');

const databases = new Databases(client);

const DB_ID = 'scorecards_db_main';
const COLL_ID = 'employee_scores_main';

async function updateSchema() {
    try {
        console.log('⏳ Updating Schema for Performance Club...');

        try {
            // Create 'performance_club' attribute
            await databases.createStringAttribute(DB_ID, COLL_ID, 'performance_club', 100, false);
            console.log('✅ Attribute Created: performance_club');
        } catch (error) {
            console.log('ℹ️ Attribute creation info:', error.message);
        }

        console.log('🎉 Schema Update Complete!');
    } catch (error) {
        console.error('❌ Update Failed:', error);
    }
}

updateSchema();
