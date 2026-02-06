
import { Client, Databases, Permission, Role } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1')
    .setProject('6985087b00129826ee02')
    .setKey('standard_f6532494a576796deee71b4ca043e18bdf1b06b6e4336447d795699da75b951cde148195b154cf8440207df0eab6e832e88b1eb75d7031a000699a0bec571a39ee70b7548c27bd249b45b4dc6919f2e06f37436bffca3049182b0f626bb0f8833db95ae168cde7bf8bc7d8b56580c5326d54a818652fe3c6d110ef0fa98aa9f6');

const databases = new Databases(client);

const DB_NAME = 'Scorecards_DB';
const DB_ID = 'scorecards_db_main'; // Custom ID for easier reference
const COLL_NAME = 'Employee_Scores';
const COLL_ID = 'employee_scores_main';

async function setup() {
    try {
        console.log('⏳ Starting Appwrite Setup...');

        // 1. Create Database
        try {
            await databases.create(DB_ID, DB_NAME);
            console.log('✅ Database Created');
        } catch (error) {
            console.log('ℹ️ Database might already exist:', error.message);
        }

        // 2. Create Collection
        try {
            await databases.createCollection(DB_ID, COLL_ID, COLL_NAME, [
                Permission.read(Role.any()), // Public Read (or restricting to authenticated later)
                Permission.write(Role.any()) // Allow writes for now (will lock down later)
            ]);
            console.log('✅ Collection Created');
        } catch (error) {
            console.log('ℹ️ Collection might already exist:', error.message);
        }

        // 3. Create Attributes
        const attributes = [
            { key: 'employee_name', type: 'string', size: 255, required: true },
            { key: 'team', type: 'string', size: 255, required: true },
            { key: 'month', type: 'string', size: 100, required: true },

            // Metrics
            { key: 'productivity_score', type: 'integer', required: false },
            { key: 'productivity_achieved', type: 'string', size: 100, required: false },
            { key: 'productivity_tier', type: 'string', size: 100, required: false },

            { key: 'quality_score', type: 'integer', required: false },
            { key: 'quality_achieved', type: 'string', size: 100, required: false },
            { key: 'quality_tier', type: 'string', size: 100, required: false },

            { key: 'attendance_score', type: 'integer', required: false },
            { key: 'attendance_value', type: 'string', size: 100, required: false },

            { key: 'unplanned_leaves_score', type: 'integer', required: false },
            { key: 'unplanned_leaves_value', type: 'integer', required: false },

            { key: 'rca_score', type: 'integer', required: false },
            { key: 'rca_value', type: 'integer', required: false },

            { key: 'pii_score', type: 'integer', required: false },
            { key: 'pii_approval', type: 'integer', required: false },

            { key: 'total_score', type: 'integer', required: false },
            { key: 'transaction_percent', type: 'string', size: 100, required: false }
        ];

        for (const attr of attributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(DB_ID, COLL_ID, attr.key, attr.size, attr.required);
                } else if (attr.type === 'integer') {
                    await databases.createIntegerAttribute(DB_ID, COLL_ID, attr.key, attr.required);
                }
                console.log(`   + Attribute Created: ${attr.key}`);
            } catch (error) {
                // Ignore if attribute already exists
                if (!error.message.includes('already exists')) {
                    console.error(`   ❌ Failed to create ${attr.key}:`, error.message);
                }
            }
            // Small delay to prevent rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log('🎉 Setup Complete! Your Database is ready.');

    } catch (error) {
        console.error('❌ Setup Failed:', error);
    }
}

setup();
