
import { Client, Databases, Permission, Role, ID } from 'node-appwrite';

// Configuration (Matching setup_appwrite.mjs)
const client = new Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1')
    .setProject('6985087b00129826ee02')
    .setKey('standard_f6532494a576796deee71b4ca043e18bdf1b06b6e4336447d795699da75b951cde148195b154cf8440207df0eab6e832e88b1eb75d7031a000699a0bec571a39ee70b7548c27bd249b45b4dc6919f2e06f37436bffca3049182b0f626bb0f8833db95ae168cde7bf8bc7d8b56580c5326d54a818652fe3c6d110ef0fa98aa9f6');

const databases = new Databases(client);

const DB_ID = 'scorecards_db_main';
const COLL_ID = 'app_config';
const COLL_NAME = 'App_Configuration';

async function setupConfig() {
    try {
        console.log('⏳ Setting up App Config Collection...');

        // 1. Create Collection
        try {
            await databases.createCollection(DB_ID, COLL_ID, COLL_NAME, [
                Permission.read(Role.any()), // Public Read (or restricting to authenticated later)
                Permission.write(Role.any()) // Allow writes
            ]);
            console.log('✅ Collection Created');
        } catch (error) {
            console.log('ℹ️ Collection might already exist:', error.message);
        }

        // 2. Create Attributes
        try {
            await databases.createStringAttribute(DB_ID, COLL_ID, 'key', 255, true);
            await databases.createStringAttribute(DB_ID, COLL_ID, 'value', 255, true);
            console.log('✅ Attributes Created');
        } catch (e) {
            console.log('ℹ️ Attributes might already exist');
        }

        // Wait for attributes to be available
        console.log('⏳ Waiting for attributes...');
        await new Promise(r => setTimeout(r, 2000));

        // 3. Seed Default Admin Password
        try {
            // Check if exists first
            const existing = await databases.listDocuments(DB_ID, COLL_ID, []);
            const adminConfig = existing.documents.find(d => d.key === 'admin_password');

            if (!adminConfig) {
                await databases.createDocument(DB_ID, COLL_ID, ID.unique(), {
                    key: 'admin_password',
                    value: 'admin123'
                });
                console.log('✅ Default Admin Password Set: admin123');
            } else {
                console.log('ℹ️ Admin Password already configured.');
            }
        } catch (e) {
            console.error('❌ Error seeding password:', e);
        }

        console.log('🎉 Config Setup Complete!');

    } catch (error) {
        console.error('❌ Setup Failed:', error);
    }
}

setupConfig();
